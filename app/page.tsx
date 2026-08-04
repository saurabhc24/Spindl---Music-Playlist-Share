import Link from "next/link";

/**
 * The landing page, from the Figma design (node 1:2).
 *
 * The composition is the design's: a record bleeding off the top edge, the
 * headline and its line of copy set left below it, and the call to action,
 * sign-in and wordmark gathered at the foot. Measurements are not — the design
 * is a fixed 393x852 phone frame, and everything here is proportional so it
 * survives a taller phone and a desktop window.
 *
 * Colours and type come from the project's tokens rather than the frame's raw
 * hexes, which are near-identical to them: #ffe59e->#dfb84d is --gold, #dfb84d
 * is --accent, #c9bd9d is --ink-dim. The one deliberate departure is the
 * backdrop -- the frame's flat #272727 against the scene gradient every other
 * page now uses, kept so the landing page stays in the same room as the rest of
 * the app.
 */
export default function Home() {
  return (
    <div
      data-shelf-scene
      className="scene relative flex min-h-[100dvh] flex-1 flex-col overflow-x-hidden"
    >
      {/* The record sits half off the top edge, as in the frame. The gradient
          underneath shows while the animation loads, and replaces it entirely
          under prefers-reduced-motion -- an animated GIF cannot be paused by
          CSS, so the only way to honour that preference is not to show it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 w-[min(161vw,728px)] -translate-x-1/2 -translate-y-1/2 select-none"
      >
        <div
          className="aspect-square w-full rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, #6d1114 0 15%, #17171b 15.5% 49%, transparent 49.5%)",
          }}
        >
          {/* A plain img, not next/image: the optimizer flattens animated GIFs
              to a single frame unless it is told to leave them alone. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vinyl.gif"
            alt=""
            width={480}
            height={480}
            className="vinyl block h-full w-full"
          />
        </div>
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col px-7">
        {/* Clears the exposed half of the record before the copy starts.
            Measured in the same unit as the record rather than in vh: the disc
            is sized off viewport *width*, so a viewport that is wide and short
            would grow the record past a vh-based gap and push it into the
            headline. Half of 161vw is 80.5vw, so 84vw leaves a little air. */}
        <div className="h-[min(84vw,380px)] shrink-0" />

        <h1 className="display max-w-[19rem] text-[34px] leading-[1.12] sm:text-[40px]">
          Everything you&apos;ve got spinning
        </h1>
        <p className="mt-6 max-w-[17rem] text-[15px] leading-relaxed text-ink-dim">
          Your playlist taste, curated into one shareable shelf — built for
          socials
        </p>

        {/* The frame leaves a deliberate void here, pushing the actions to the
            foot of the screen rather than stacking them under the copy. */}
        <div className="flex-1" />

        <div className="flex flex-col items-center gap-3.5 pb-9 pt-16">
          <Link href="/login" className="btn-gold !px-6 !py-3">
            Claim your link
          </Link>

          <p className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-ink-dim">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </p>

          {/* The frame sets the wordmark in Maxi, not the headline's Midi. */}
          <span className="wordmark mt-3 text-[17px] tracking-wide">Spindl</span>
        </div>
      </main>
    </div>
  );
}
