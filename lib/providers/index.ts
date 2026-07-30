import "server-only";

import type { MusicProvider } from "@/app/generated/prisma/enums";

import { spotify, isSpotifyConfigured } from "./spotify";
import { youtube, isYouTubeConfigured } from "./youtube";
import type { ProviderClient } from "./types";

export const PROVIDERS: Record<MusicProvider, ProviderClient> = {
  SPOTIFY: spotify,
  YOUTUBE: youtube,
};

/** Maps the `[provider]` URL segment (e.g. "spotify") to the enum value. */
export function parseProviderSlug(slug: string): MusicProvider | null {
  const normalized = slug.toUpperCase();
  return normalized in PROVIDERS ? (normalized as MusicProvider) : null;
}

export function providerSlug(provider: MusicProvider) {
  return provider.toLowerCase();
}

export function isProviderConfigured(provider: MusicProvider) {
  return provider === "SPOTIFY" ? isSpotifyConfigured() : isYouTubeConfigured();
}

export { spotify, youtube };
export * from "./types";
