import Image from "next/image";
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
      {/* The record sits half off the top edge, as in the frame. Decorative:
          the headline underneath already says what this is. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 w-[min(124vw,560px)] -translate-x-1/2 -translate-y-1/2 select-none"
      >
        <Image
          src="/vinyl-record.png"
          alt=""
          width={350}
          height={350}
          priority
          className="h-auto w-full"
        />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col px-7">
        {/* Clears the exposed half of the record before the copy starts. */}
        <div className="h-[34vh] min-h-[168px] shrink-0" />

        <h1 className="serif max-w-[19rem] text-[34px] leading-[1.12] sm:text-[40px]">
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

          <span className="serif mt-3 text-[17px] tracking-wide">Spindl</span>
        </div>
      </main>
    </div>
  );
}
