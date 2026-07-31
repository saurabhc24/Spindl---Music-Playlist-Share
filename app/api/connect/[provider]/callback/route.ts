import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/app-url";
import { requireUser } from "@/lib/dal";
import { encryptNullable } from "@/lib/crypto";
import { verifyOAuthState } from "@/lib/oauth-state";
import { PROVIDERS, parseProviderSlug } from "@/lib/providers";
import { prisma } from "@/lib/prisma";
import { syncProvider } from "@/lib/sync";

function connectionsUrl(params: Record<string, string>) {
  const url = new URL(absoluteUrl("/dashboard/connections"));
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/connect/[provider]/callback">
) {
  const user = await requireUser();

  const { provider: slug } = await context.params;
  const provider = parseProviderSlug(slug);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // The user hit "cancel" on the provider's consent screen.
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      connectionsUrl({ error: "denied", provider: slug })
    );
  }

  if (!(await verifyOAuthState(provider, searchParams.get("state")))) {
    return NextResponse.redirect(
      connectionsUrl({ error: "invalid_state", provider: slug })
    );
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      connectionsUrl({ error: "missing_code", provider: slug })
    );
  }

  // Connecting and importing are reported separately on purpose. They used to
  // share one try/catch, so a provider that authorized fine but refused the
  // playlist read -- Spotify without Premium on the app owner, an exhausted
  // YouTube quota -- sent the user back to reconnect an account that was
  // already linked, and no amount of retrying could clear the message.
  let connection;
  try {
    const client = PROVIDERS[provider];
    const tokens = await client.exchangeCode(code);

    connection = await prisma.connectedAccount.upsert({
      where: { userId_provider: { userId: user.id, provider } },
      create: {
        userId: user.id,
        provider,
        accessTokenEncrypted: encryptNullable(tokens.accessToken),
        refreshTokenEncrypted: encryptNullable(tokens.refreshToken),
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
      },
      update: {
        accessTokenEncrypted: encryptNullable(tokens.accessToken),
        // Providers omit the refresh token on re-consent sometimes; don't clobber
        // a good stored one with null.
        ...(tokens.refreshToken
          ? { refreshTokenEncrypted: encryptNullable(tokens.refreshToken) }
          : {}),
        scope: tokens.scope,
        expiresAt: tokens.expiresAt,
      },
    });

  } catch (error) {
    console.error(`[connect:${slug}] token exchange failed`, error);
    return NextResponse.redirect(
      connectionsUrl({ error: "exchange_failed", provider: slug })
    );
  }

  // Past this point the account IS connected and its tokens are stored, so any
  // failure below is an import problem, not a connection problem.
  try {
    // Pull playlists immediately so the dashboard isn't empty after connecting.
    await syncProvider({
      userId: user.id,
      connection: { ...connection, provider },
    });
  } catch (error) {
    // syncProvider has already recorded the provider's own reason in
    // lastSyncStatus, which the connections page turns into a specific hint.
    console.error(`[connect:${slug}] first import failed`, error);
    return NextResponse.redirect(
      connectionsUrl({ connected: slug, error: "import_failed", provider: slug })
    );
  }

  return NextResponse.redirect(connectionsUrl({ connected: slug }));
}
