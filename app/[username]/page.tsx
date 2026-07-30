import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { getPublicProfile, getRenamedProfileTarget } from "@/lib/profile";
import { normalizeUsername } from "@/lib/username";
import { ProviderIcon, providerLabel } from "@/components/provider-badge";

// Short ISR window as a safety net; dashboard mutations call revalidatePath on
// this route so edits show up immediately rather than waiting this out.
export const revalidate = 60;

// Required for ISR on a dynamic segment. Without it Next treats this route as
// fully dynamic and serves `Cache-Control: no-store`, meaning every profile view
// hits the database -- the opposite of what we want on the highest-traffic page
// in the app. Returning [] prerenders nothing at build time (we can't know
// usernames ahead of time); pages are generated on first request and then cached
// at the edge. Verified via `x-nextjs-cache: HIT` on repeat requests.
export async function generateStaticParams() {
  return [];
}

// Usernames not in the (empty) prerender list must still render on demand.
export const dynamicParams = true;

export async function generateMetadata(
  props: PageProps<"/[username]">
): Promise<Metadata> {
  const { username } = await props.params;
  const data = await getPublicProfile(username);

  if (!data) return { title: "Page not found" };

  const name = data.profile.displayName || data.profile.username;
  const title = `${name}'s playlists`;
  const description =
    data.profile.bio ||
    `Listen to playlists shared by ${name} on Spotify and YouTube.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfilePage(
  props: PageProps<"/[username]">
) {
  const { username } = await props.params;

  // Send every casing/compatibility variant to one canonical URL. Beyond
  // avoiding duplicate content, each variant would otherwise get its own ISR
  // cache entry and its own render, fragmenting the edge cache across
  // /demo, /Demo, /DEMO and so on.
  const canonical = normalizeUsername(username);
  if (canonical && canonical !== username) permanentRedirect(`/${canonical}`);

  const data = await getPublicProfile(username);

  if (!data) {
    // Before giving up, check whether this name was released by a profile that
    // has since been renamed, and send the visitor to its current home. A
    // permanent redirect so search engines and shared links follow the move.
    const currentUsername = await getRenamedProfileTarget(username);
    if (currentUsername) permanentRedirect(`/${currentUsername}`);
    notFound();
  }

  const { profile, playlists } = data;
  const displayName = profile.displayName || profile.username;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <header className="flex flex-col items-center text-center">
        {profile.avatarUrl ? (
          // Avatars come from arbitrary provider CDNs, so plain <img> avoids
          // having to allowlist every remote host in next.config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-zinc-200 text-3xl font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {displayName}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          @{profile.username}
        </p>

        {profile.bio && (
          <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {profile.bio}
          </p>
        )}
      </header>

      {playlists.length === 0 ? (
        <p className="mt-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No playlists shared yet. Check back soon.
        </p>
      ) : (
        <ul className="mt-12 space-y-3">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <a
                href={playlist.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-xl border border-zinc-200 p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {playlist.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={playlist.coverImageUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{playlist.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <ProviderIcon
                      provider={playlist.provider}
                      className="h-3.5 w-3.5"
                    />
                    {providerLabel(playlist.provider)}
                    {playlist.trackCount !== null && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        {playlist.trackCount} tracks
                      </>
                    )}
                  </p>
                </div>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-16 text-center">
        <Link
          href="/"
          className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Make your own Spindl
        </Link>
      </footer>
    </div>
  );
}
