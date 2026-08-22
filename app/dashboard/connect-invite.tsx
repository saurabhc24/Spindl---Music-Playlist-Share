import Link from "next/link";

import {
  isProviderConfigured,
  providerSlug,
  type ConnectableProvider,
} from "@/lib/providers";

/**
 * What the dashboard shows before anything is connected.
 *
 * A first-run screen rather than an empty state tucked under the stats: with no
 * connections there are no playlists, so every number on the page would be zero
 * and the only useful thing on it is this. Once a service is connected the
 * overview takes the page back.
 *
 * The three routes out are the three ways a playlist can arrive: authorize
 * Spotify, authorize YouTube, or paste a public link for anything else.
 */

type Service = {
  provider: ConnectableProvider;
  /** In public/, supplied by the design. */
  icon: string;
  width: number;
  height: number;
  blurb: string;
};

const SERVICES: Service[] = [
  {
    provider: "SPOTIFY",
    icon: "/Spotify_icon.svg",
    width: 38,
    height: 39,
    blurb: "Import your playlists that you created or follow on Spotify.",
  },
  {
    provider: "YOUTUBE",
    icon: "/YouTube_icon.svg",
    width: 38,
    height: 26,
    // Says YouTube rather than YouTube Music, because there is no YouTube Music
    // API -- those playlists simply surface through the YouTube one.
    blurb: "Bring in your YouTube playlists, YouTube Music ones included.",
  },
];

export function ConnectInvite() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
      {/* Sized to sit on one line, which is how the design reads it. Measured
          off the reference that is about 23px; the clamp keeps it there on a
          393px screen and shrinks rather than wraps on a narrower one. */}
      <h1 className="heading text-[clamp(20px,6vw,24px)] font-bold leading-tight">
        Connect to your music service
      </h1>
      <p className="mt-4 max-w-[24rem] text-base leading-relaxed text-ink-dim">
        Link Spotify or YouTube Music to import your playlists and start building
        your page
      </p>

      <div className="mt-10 w-full space-y-6">
        {SERVICES.map(({ provider, icon, width, height, blurb }) => {
          const slug = providerSlug(provider);
          const configured = isProviderConfigured(provider);

          // An unconfigured provider has no OAuth client to send anyone to, so
          // the card goes to the Connections page, which already explains that
          // state properly rather than failing at the provider.
          const href = configured
            ? `/api/connect/${slug}`
            : "/dashboard/connections";

          return (
            <a
              key={provider}
              href={href}
              className="flex items-center gap-6 rounded-2xl bg-[oklch(0.22_0.012_66)] px-6 py-6 text-left transition-colors hover:bg-[oklch(0.25_0.014_66)]"
            >
              <span className="flex w-[46px] shrink-0 justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon} alt="" width={width} height={height} />
              </span>
              <span className="text-base leading-relaxed text-ink">{blurb}</span>
            </a>
          );
        })}
      </div>

      {/* The third route in. Quieter than the two cards because it is the
          fallback: it is what you use when the playlist lives somewhere we
          cannot authorize, or is not yours. */}
      <Link
        href="/dashboard/playlists"
        className="group mt-14 flex flex-col items-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Add_link_vector.svg"
          alt=""
          width={34}
          height={34}
          className="opacity-60 transition-opacity group-hover:opacity-100"
        />
        <span className="mt-4 max-w-[20rem] text-base leading-relaxed text-ink-faint transition-colors group-hover:text-ink-dim">
          Paste public Spotify or YouTube music link to import it.
        </span>
      </Link>

      <span className="wordmark mt-16 text-[20px] tracking-wide">
        SpindlShare
      </span>
    </div>
  );
}
