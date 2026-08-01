import "server-only";

import type { MusicProvider } from "@/app/generated/prisma/enums";

import { spotify, isSpotifyConfigured } from "./spotify";
import { youtube, isYouTubeConfigured } from "./youtube";
import type { ProviderClient } from "./types";

/**
 * Only the providers that can actually be connected and imported from.
 *
 * Deliberately NOT `Record<MusicProvider, ProviderClient>`. The enum also holds
 * OTHER, which exists purely so a playlist can be listed by link -- it has no
 * API, so no client can be written for it. Typing this as a
 * complete record would force a fake entry for each; typing it as Partial would
 * push a null check into every OAuth call site. Deriving the key type from the
 * object instead means the compiler rejects an unconnectable provider reaching
 * `getAuthorizationUrl` at all, rather than us remembering to guard.
 */
export const PROVIDERS = {
  SPOTIFY: spotify,
  YOUTUBE: youtube,
} as const satisfies Partial<Record<MusicProvider, ProviderClient>>;

/** A provider with OAuth and an import path -- a strict subset of MusicProvider. */
export type ConnectableProvider = keyof typeof PROVIDERS;

/** Maps the `[provider]` URL segment (e.g. "spotify") to the enum value. */
export function parseProviderSlug(slug: string): ConnectableProvider | null {
  const normalized = slug.toUpperCase();
  return normalized in PROVIDERS ? (normalized as ConnectableProvider) : null;
}

export function providerSlug(provider: MusicProvider) {
  return provider.toLowerCase();
}

export function isProviderConfigured(provider: ConnectableProvider) {
  return provider === "SPOTIFY" ? isSpotifyConfigured() : isYouTubeConfigured();
}

export { spotify, youtube };
export * from "./types";
