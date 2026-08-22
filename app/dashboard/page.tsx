import Link from "next/link";

import { signOut } from "@/lib/auth";
import { requireProfile } from "@/lib/dal";
import { providerSlug, type ConnectableProvider } from "@/lib/providers";

/**
 * The first screen of the signed-in app: pick a music service to import from.
 *
 * Built as a whole viewport rather than a panel inside a shell, which is why it
 * carries its own header and wordmark instead of inheriting them from a
 * dashboard layout. The design pins one to the top edge and one to the bottom
 * with the invitation floating between them, and `justify-between` on a column
 * that fills the screen is what does that.
 *
 * The scene gradient every other route sits on is painted over here on purpose:
 * the design asks for one flat warm dark, and a radial highlight rising behind
 * these cards reads as a smudge rather than as depth.
 */

type Service = {
  provider: ConnectableProvider;
  /** In public/, exported from the design at the size it is drawn. */
  icon: string;
  width: number;
  height: number;
  blurb: string;
};

const SERVICES: Service[] = [
  {
    provider: "SPOTIFY",
    icon: "/Spotify_icon.svg",
    width: 39,
    height: 40,
    blurb: "Import your playlists that you created or follow on Spotify.",
  },
  {
    provider: "YOUTUBE",
    icon: "/YouTube_icon.svg",
    width: 39,
    height: 27,
    // Says YouTube rather than YouTube Music because there is no YouTube Music
    // API -- those playlists simply surface through the YouTube one.
    blurb: "Bring in your YouTube playlists, YouTube Music ones included.",
  },
];

/**
 * Where a round trip through a provider can land. Both connect routes redirect
 * back here now, so this is the only place these outcomes get explained -- and
 * the note is the one thing on the screen the design has no box for, which is
 * why it borrows the app's existing `.note` treatment rather than inventing a
 * shape of its own.
 */
const ERROR_MESSAGES: Record<string, string> = {
  denied: "You cancelled the connection. Nothing was changed.",
  invalid_state: "That connection link expired. Please try again.",
  missing_code: "The service didn't return an authorization code. Try again.",
  exchange_failed: "We couldn't complete the connection. Please try again.",
  // The account linked fine; only the first playlist read failed. Saying
  // "couldn't connect" here would send someone off to reconnect something that
  // is already connected, which no amount of retrying can fix.
  import_failed: "Connected, but we couldn't import your playlists yet.",
  not_configured:
    "This service isn't configured yet. Add its API credentials to your environment.",
};

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const { profile } = await requireProfile();

  const searchParams = await props.searchParams;
  const rawError = searchParams.error;
  const errorKey = Array.isArray(rawError) ? rawError[0] : rawError;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : null;

  return (
    <div className="flex flex-1 flex-col bg-[#150e07]">
      {/* The design is drawn on a phone. On anything wider the column stops
          growing and centres, so the cards keep the proportions they were drawn
          with instead of stretching into letterboxes. */}
      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col justify-between gap-10 px-6 py-8">
        <header className="flex w-full items-center justify-between gap-4">
          {/* The avatar and handle are the door to the public page. The design
              draws them as identity rather than as a link, so the affordance is
              held back to a hover. */}
          <Link
            href={`/${profile.username}`}
            className="group flex min-w-0 items-center gap-2"
          >
            <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--panel-solid)]">
              {profile.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-medium text-accent">
                  {profile.username.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="truncate text-sm font-medium text-white transition-colors group-hover:text-accent">
              {profile.username}
            </span>
          </Link>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="cursor-pointer text-sm font-medium whitespace-nowrap text-white transition-colors hover:text-accent"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="flex w-full flex-col gap-9">
          <div className="flex flex-col items-center gap-3 text-center text-white">
            {/* Sized to sit on one line, which is how the design reads it, and
                given the column's full width to do it in -- at the drawn 24px
                the sentence needs about 330px and there are 345 to spend, so
                the inset the paragraph below wants would cost it the line.
                Below the design's width the clamp shrinks it rather than
                letting it wrap. */}
            <h1 className="heading text-[clamp(18px,6vw,24px)]">
              Connect to your music service
            </h1>
            <p className="px-3 text-sm">
              Link Spotify or Youtube Music to import your playlists and start
              building your page
            </p>
          </div>

          {errorMessage && (
            <p role="alert" className="note note-error">
              {errorMessage}
            </p>
          )}

          <div className="flex w-full flex-col gap-6">
            {SERVICES.map(({ provider, icon, width, height, blurb }) => (
              /* Straight to the OAuth route even when the provider has no
                 credentials configured: that route already redirects back here
                 saying so, which is a better answer than a card that quietly
                 leads somewhere else. */
              <a
                key={provider}
                href={`/api/connect/${providerSlug(provider)}`}
                className="flex w-full items-center justify-center gap-6 overflow-hidden rounded-lg bg-[rgba(115,115,115,0.21)] p-6 transition-colors hover:bg-[rgba(115,115,115,0.3)]"
              >
                <span className="flex w-[39px] shrink-0 justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icon} alt="" width={width} height={height} />
                </span>
                <span className="flex-1 text-sm text-white">{blurb}</span>
              </a>
            ))}

            {/* The third way a playlist can arrive, for anything we cannot
                authorize or that isn't yours. Quieter than the two cards
                because it is the fallback rather than the invitation. */}
            <div className="flex w-full flex-col items-center gap-3 px-6 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Add_link_vector.svg" alt="" width={43} height={43} />
              <p className="w-[243px] text-center text-sm text-[#737373]">
                Paste public Spotify or YouTube music link to import it.
              </p>
            </div>
          </div>
        </main>

        <footer className="flex w-full items-center justify-center p-1">
          <span className="wordmark text-white">SpindlShare</span>
        </footer>
      </div>
    </div>
  );
}
