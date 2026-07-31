/**
 * Adding a playlist by pasting its link.
 *
 * This exists because neither provider will let an unreviewed app import on
 * behalf of arbitrary users: Spotify caps a development-mode app at five
 * hand-added accounts, and Google requires verification before a sensitive
 * scope reaches the public. A pasted link needs no account of any kind, so it
 * is the only path to a playlist that works for every user of Spindl.
 *
 * Parsing is deliberately free of server-only imports, so the same rules give
 * instant feedback in the browser and remain the source of truth on the server.
 */

import type { MusicProvider } from "@/app/generated/prisma/enums";

export type ParsedPlaylistLink = {
  provider: MusicProvider;
  externalId: string;
  /** Canonical URL we rebuild ourselves -- never the string the user pasted. */
  externalUrl: string;
};

/**
 * Spotify ids are base62; YouTube list ids add - and _. Both are length-capped
 * so a pathological string can't be carried into a URL or a database column.
 */
const SPOTIFY_ID = /^[A-Za-z0-9]{16,40}$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{12,64}$/;

/**
 * Extracts the provider and playlist id from a pasted link.
 *
 * Returns null for anything unrecognized rather than guessing. The id is then
 * used to rebuild a canonical URL from a hardcoded prefix -- the pasted string
 * is never fetched or stored, so a crafted link cannot point our server at an
 * arbitrary host.
 */
export function parsePlaylistLink(input: unknown): ParsedPlaylistLink | null {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw || raw.length > 2048) return null;

  // Spotify's own share menu hands out URIs as well as URLs.
  const uri = /^spotify:playlist:([A-Za-z0-9]+)$/.exec(raw);
  if (uri && SPOTIFY_ID.test(uri[1])) return spotifyLink(uri[1]);

  let url: URL;
  try {
    // A bare "open.spotify.com/..." paste has no scheme; assume https rather
    // than rejecting, since that is what the user meant.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "open.spotify.com" || host === "play.spotify.com") {
    // Localized share links carry a segment before the type:
    // /intl-de/playlist/{id}. Match the id by position after "playlist".
    const segments = url.pathname.split("/").filter(Boolean);
    const index = segments.indexOf("playlist");
    const id = index === -1 ? null : segments[index + 1];
    if (id && SPOTIFY_ID.test(id)) return spotifyLink(id);
    return null;
  }

  if (
    host === "youtube.com" ||
    host === "music.youtube.com" ||
    host === "m.youtube.com"
  ) {
    // Covers /playlist?list=, and a /watch?v=...&list= link copied while
    // playing a video from the playlist.
    const list = url.searchParams.get("list");
    if (list && YOUTUBE_ID.test(list)) return youtubeLink(list);
    return null;
  }

  return null;
}

function spotifyLink(externalId: string): ParsedPlaylistLink {
  return {
    provider: "SPOTIFY",
    externalId,
    externalUrl: `https://open.spotify.com/playlist/${externalId}`,
  };
}

function youtubeLink(externalId: string): ParsedPlaylistLink {
  return {
    provider: "YOUTUBE",
    externalId,
    externalUrl: `https://www.youtube.com/playlist?list=${externalId}`,
  };
}

export type ResolvedPlaylist = {
  title: string;
  coverImageUrl: string | null;
};

export class PlaylistLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaylistLinkError";
  }
}

/** Providers are slow sometimes; a paste shouldn't hang the form indefinitely. */
const RESOLVE_TIMEOUT_MS = 8000;

/**
 * Reads a playlist's title and cover from the provider's public oEmbed endpoint.
 *
 * oEmbed is the whole point of this feature: it needs no client id, no token, no
 * user consent and has no per-user quota -- it is the same public endpoint that
 * makes these links unfurl in chat apps. It only describes *public* playlists,
 * which is the correct boundary anyway: a Spindl page is public, so a playlist
 * that can't be seen without logging in has no business being listed on one.
 */
export async function resolvePlaylistLink(
  link: ParsedPlaylistLink
): Promise<ResolvedPlaylist> {
  // Built from `link.externalUrl`, which we constructed from a validated id --
  // not from anything the user typed.
  const endpoint =
    link.provider === "SPOTIFY"
      ? `https://open.spotify.com/oembed?url=${encodeURIComponent(link.externalUrl)}`
      : `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.externalUrl)}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new PlaylistLinkError(
      "Couldn't reach the service to check that link. Please try again."
    );
  }

  // Both providers answer 401/403/404 for a playlist that is private, deleted,
  // or never existed. None of those are distinguishable from outside, and the
  // user's next step is the same for all three.
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    throw new PlaylistLinkError(
      "That playlist is private or doesn't exist. Only public playlists can be added by link."
    );
  }
  if (!response.ok) {
    throw new PlaylistLinkError(
      "The service couldn't describe that playlist right now. Please try again."
    );
  }

  let payload: { title?: unknown; thumbnail_url?: unknown };
  try {
    payload = await response.json();
  } catch {
    throw new PlaylistLinkError("Got an unreadable response for that link.");
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim().slice(0, 200)
      : "Untitled playlist";

  // Only accept an https image URL: it goes straight into an <img src> on a
  // public page, so a javascript: or data: value has no business here.
  const thumbnail =
    typeof payload.thumbnail_url === "string" &&
    /^https:\/\//i.test(payload.thumbnail_url)
      ? payload.thumbnail_url
      : null;

  return { title, coverImageUrl: thumbnail };
}
