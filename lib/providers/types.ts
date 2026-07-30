import type { MusicProvider } from "@/app/generated/prisma/enums";

/** A playlist normalized across providers, ready to upsert into the Playlist table. */
export type NormalizedPlaylist = {
  externalId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  externalUrl: string;
  trackCount: number | null;
};

/** The result of an OAuth code exchange or refresh. */
export type OAuthTokens = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

export type ProviderClient = {
  provider: MusicProvider;
  /** Where to send the user to grant access. */
  getAuthorizationUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;
  fetchPlaylists(accessToken: string): Promise<NormalizedPlaylist[]>;
};

export class ProviderAuthError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ProviderAuthError";
  }
}
