import { NextResponse } from "next/server";

import { requireUser } from "@/lib/dal";
import { createOAuthState } from "@/lib/oauth-state";
import { PROVIDERS, isProviderConfigured, parseProviderSlug } from "@/lib/providers";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/connect/[provider]">
) {
  await requireUser();

  const { provider: slug } = await context.params;
  const provider = parseProviderSlug(slug);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  if (!isProviderConfigured(provider)) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/connections?error=not_configured&provider=${slug}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    );
  }

  const state = await createOAuthState(provider);
  return NextResponse.redirect(PROVIDERS[provider].getAuthorizationUrl(state));
}
