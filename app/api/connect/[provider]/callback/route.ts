import { NextResponse } from "next/server";

import { requireUser } from "@/lib/dal";
import { encryptNullable } from "@/lib/crypto";
import { verifyOAuthState } from "@/lib/oauth-state";
import { PROVIDERS, parseProviderSlug } from "@/lib/providers";
import { prisma } from "@/lib/prisma";
import { syncProvider } from "@/lib/sync";

function connectionsUrl(params: Record<string, string>) {
  const url = new URL("/dashboard/connections", process.env.NEXT_PUBLIC_APP_URL);
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

  try {
    const client = PROVIDERS[provider];
    const tokens = await client.exchangeCode(code);

    const connection = await prisma.connectedAccount.upsert({
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

    // Pull playlists immediately so the dashboard isn't empty after connecting.
    await syncProvider({ userId: user.id, connection });

    return NextResponse.redirect(
      connectionsUrl({ connected: slug })
    );
  } catch (error) {
    console.error(`[connect:${slug}] callback failed`, error);
    return NextResponse.redirect(
      connectionsUrl({ error: "exchange_failed", provider: slug })
    );
  }
}
