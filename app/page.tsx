import Link from "next/link";

import { showcaseFonts } from "@/app/fonts";
import { displayUrl } from "@/lib/app-url";

/**
 * The landing page, in the same scene as a Spindl itself.
 *
 * It shows a shelf rather than describing one: the covers, the lit edge and the
 * reflections are the same treatment a real page uses, so what someone is being
 * offered is on screen before they read a word of it.
 *
 * Deliberately a server component with no session read. Adding `auth()` here to
 * greet a signed-in visitor would turn the most-visited route in the app from a
 * static prerender into a per-request render with a database lookup; /login
 * already redirects an existing session to /dashboard, so the outcome is the
 * same for free.
 */

const SCENE_BACKGROUND =
  "radial-gradient(120% 80% at 50% -6%, oklch(0.24 0.02 70) 0%, oklch(0.16 0.015 65) 32%, oklch(0.09 0.01 60) 66%, #060504 100%)";

/**
 * Stand-ins for the shelf, not claims about anyone's library. The hues are fixed
 * rather than derived so the composition is stable and reads as designed.
 */
const DEMO_COVERS = [
  { mark: "M", title: "Midnight drive", service: "Spotify", dot: "#1ed760", hue: 275 },
  { mark: "K", title: "Kitchen dancing", service: "YouTube", dot: "#ff3d3d", hue: 40 },
  { mark: "D", title: "Deep focus", service: "Amazon Music", dot: "#25d1da", hue: 230 },
];

export default function Home() {
  return (
    <div
      data-shelf-scene
      className={`${showcaseFonts} relative flex flex-1 flex-col overflow-hidden`}
      style={{
        background: SCENE_BACKGROUND,
        fontFamily: "var(--font-manrope), sans-serif",
        color: "oklch(0.94 0.01 85)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 34% at 50% 8%, oklch(0.9 0.08 85 / 0.13), transparent 62%)",
          animation: "shelfPulse 7s ease-in-out infinite",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <span
          className="text-lg"
          style={{ fontFamily: "var(--font-instrument-serif), serif" }}
        >
          Spindl
        </span>
        <Link
          href="/login"
          className="text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ color: "oklch(0.86 0.08 82)" }}
        >
          Sign in
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 pb-10 text-center">
        <p
          className="text-[11px] font-semibold uppercase"
          style={{ letterSpacing: "0.18em", color: "oklch(0.66 0.04 82)" }}
        >
          One link, everything you play
        </p>

        <h1
          className="mt-5 max-w-2xl text-[42px] leading-[1.05] sm:text-6xl"
          style={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontWeight: 400,
            letterSpacing: "0.4px",
          }}
        >
          Everything you&apos;ve got spinning
        </h1>

        <p
          className="mt-5 max-w-lg text-[15px] leading-relaxed sm:text-base"
          style={{ color: "oklch(0.74 0.02 82)" }}
        >
          Put your favourite Spotify, YouTube and Amazon Music playlists on a
          shelf worth showing off — and share the whole thing with one link.
        </p>

        <div className="mt-9 flex flex-col items-center gap-4">
          <Link
            href="/login"
            className="rounded-full px-7 py-3.5 text-sm font-bold transition-transform hover:-translate-y-0.5"
            style={{
              color: "#151210",
              background:
                "linear-gradient(180deg, oklch(0.92 0.07 86), oklch(0.82 0.09 80))",
              boxShadow:
                "0 10px 26px oklch(0.75 0.09 78 / 0.35), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            Claim your link
          </Link>
          <p className="text-xs" style={{ color: "oklch(0.6 0.02 80)" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold underline underline-offset-4"
              style={{ color: "oklch(0.86 0.08 82)" }}
            >
              Sign in
            </Link>
          </p>
        </div>

        <ShelfPreview />
      </main>

      <footer
        className="relative z-10 flex items-center justify-center gap-2 px-6 pb-7 text-xs"
        style={{ color: "oklch(0.5 0.015 78)" }}
      >
        <span aria-hidden="true">🔗</span>
        {/* Read from NEXT_PUBLIC_APP_URL rather than written down here, so a
            domain move doesn't leave the landing page advertising a dead host --
            which is exactly what happened to the last hardcoded copy. */}
        <span style={{ fontWeight: 600, color: "oklch(0.72 0.05 84)" }}>
          {displayUrl("/yourname")}
        </span>
      </footer>
    </div>
  );
}

/**
 * The product, rather than a screenshot of it: the same covers, lit shelf edge
 * and reflections a real Spindl renders. Purely decorative, so it is hidden from
 * assistive technology -- the heading above already says what this is.
 */
function ShelfPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative mt-14 w-full max-w-xl select-none sm:mt-16"
    >
      <div
        className="absolute bottom-3 left-[2%] right-[2%] h-24 sm:h-28"
        style={{
          background:
            "linear-gradient(to top, oklch(0.95 0.05 88 / 0.5), oklch(0.86 0.05 85 / 0.13) 46%, transparent 82%)",
          clipPath: "polygon(9% 100%, 91% 100%, 76% 0%, 24% 0%)",
        }}
      />
      <div
        className="absolute bottom-3.5 left-[10%] right-[10%] h-16"
        style={{
          background:
            "radial-gradient(60% 120% at 50% 100%, oklch(0.96 0.06 88 / 0.5), transparent 70%)",
          filter: "blur(9px)",
        }}
      />

      <div className="relative z-10 flex items-end justify-center gap-5 px-4 pb-1 sm:gap-10">
        {DEMO_COVERS.map((cover, index) => (
          <div
            key={cover.mark}
            className="flex flex-col items-center"
            style={{
              animation: "shelfFloat 6s ease-in-out infinite",
              // Staggered so the three don't rise and fall as one block.
              animationDelay: `${index * 0.8}s`,
            }}
          >
            <div
              className="relative h-[86px] w-[86px] overflow-hidden rounded-[11px] sm:h-[130px] sm:w-[130px] sm:rounded-[15px]"
              style={{
                background: `linear-gradient(150deg, oklch(0.62 0.16 ${cover.hue}), oklch(0.42 0.13 ${(cover.hue + 40) % 360}))`,
                boxShadow:
                  "0 20px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.22)",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(80% 60% at 28% 22%, rgba(255,255,255,0.4), transparent 55%)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "repeating-linear-gradient(115deg, transparent 0 12px, rgba(255,255,255,0.06) 12px 13px)",
                }}
              />
              <div
                className="absolute left-3 top-2 text-[34px] leading-none sm:text-[50px]"
                style={{
                  fontFamily: "var(--font-instrument-serif), serif",
                  color: "rgba(255,255,255,0.92)",
                  textShadow: "0 2px 12px rgba(0,0,0,0.3)",
                }}
              >
                {cover.mark}
              </div>
              <div className="absolute inset-y-0 left-0 w-[38%] overflow-hidden">
                <div
                  className="absolute inset-y-0 w-[60%]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.26), transparent)",
                    animation: "shelfSheen 5.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            <div
              className="h-8 w-[86px] rounded-b-[11px] sm:h-[46px] sm:w-[130px] sm:rounded-b-[15px]"
              style={{
                marginTop: 2,
                background: `linear-gradient(150deg, oklch(0.62 0.16 ${cover.hue}), oklch(0.42 0.13 ${(cover.hue + 40) % 360}))`,
                opacity: 0.38,
                WebkitMaskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 86%)",
                maskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 86%)",
              }}
            />

            <div className="mt-2 flex flex-col items-center gap-1.5">
              <div
                className="text-[13px] leading-tight sm:text-[17px]"
                style={{
                  fontFamily: "var(--font-instrument-serif), serif",
                  color: "oklch(0.95 0.01 85)",
                }}
              >
                {cover.title}
              </div>
              <div
                className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 sm:inline-flex"
                style={{
                  background: "oklch(0.24 0.015 68 / 0.7)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background: cover.dot,
                    boxShadow: `0 0 8px ${cover.dot}`,
                  }}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={{ letterSpacing: "0.3px", color: "oklch(0.82 0.015 85)" }}
                >
                  {cover.service}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        className="relative z-0 h-4 rounded-[5px]"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.55 0.03 78 / 0.55), oklch(0.28 0.02 68 / 0.7))",
          boxShadow:
            "0 16px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.16)",
        }}
      />
      <div
        className="relative z-10 h-[3px] rounded-full"
        style={{
          marginTop: -9,
          background:
            "linear-gradient(to right, transparent, oklch(0.97 0.06 88), oklch(0.99 0.03 92) 50%, oklch(0.97 0.06 88), transparent)",
          boxShadow:
            "0 0 22px oklch(0.96 0.07 88 / 0.85), 0 0 54px oklch(0.9 0.08 85 / 0.5)",
        }}
      />
    </div>
  );
}
