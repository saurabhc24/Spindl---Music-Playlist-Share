import Link from "next/link";

/**
 * The landing page, from the Figma design (node 44:6).
 *
 * The composition is the design's: the headline and its line of copy set left
 * near the top, a deliberate void, then the call to action, sign-in and wordmark
 * gathered at the foot above a turntable bleeding off the bottom edge.
 *
 * Proportions rather than measurements. The frame is a fixed 393x852 phone, and
 * its offsets are expressed here as fractions of the viewport, so the page holds
 * its shape on a taller phone and in a desktop window instead of pinning text to
 * pixel rows that only mean something at one size.
 *
 * Colours and type come from the project's tokens rather than the frame's raw
 * hexes, which are near-identical: #ffe59e->#dfb84d is --gold, #dfb84d is
 * --accent, #c9bd9d is --ink-dim. The backdrop is the one deliberate departure --
 * the scene gradient every other page uses, rather than the frame's flat
 * #272727, so the landing page stays in the same room as the rest of the app.
 */
export default function Home() {
  return (
    <div
      data-shelf-scene
      className="scene relative flex h-[100dvh] flex-col overflow-hidden"
    >
      {/* The frame starts the headline about a fifth of the way down. Held as a
          fraction so it stays a fifth on any screen, with a floor for very short
          windows where a proportional gap would leave nothing for the copy. */}
      <main className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col px-7 pb-[min(45vw,238px,22vh)] pt-[max(64px,19vh)]">
        <h1 className="display max-w-[19rem] text-[clamp(26px,4.4vh,36px)] leading-[1.12] sm:text-[40px]">
          Everything you&apos;ve got spinning
        </h1>
        <p className="mt-6 max-w-[17rem] text-[15px] leading-relaxed text-ink-dim">
          Your playlist taste, curated into one shareable shelf — built for
          socials
        </p>

        {/* The frame leaves a deliberate void here, pushing the actions to the
            foot of the screen rather than stacking them under the copy. */}
        <div className="flex-1" />

        <div className="flex flex-col items-center gap-3.5 pt-8">
          <Link href="/login" className="btn-gold !px-6 !py-3">
            Claim your link
          </Link>

          <p className="flex flex-wrap items-center justify-center gap-1 text-[11px] text-ink-dim">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent underline underline-offset-4"
            >
              Sign In
            </Link>
          </p>

          {/* The frame sets the wordmark in Maxi, not the headline's Midi. */}
          <span className="wordmark mt-3 text-[17px] tracking-wide">
            SpindlShare
          </span>
        </div>
      </main>

      {/* Pinned to the foot rather than placed in the flow: in the flow it was
          added after main had already filled the viewport, so the page grew past
          one screen and the band sat below the fold. The frame crops the deck to
          a middle slice -- neither the very top nor the base -- which centring
          the oversized image inside a short band reproduces. Decorative: the
          copy above already says what the page is. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex select-none justify-center"
      >
        {/* The deck is capped at a phone-ish width instead of tracking the
            viewport. Sized to the full page it reached ~2000px across on a
            desktop, which made it ~1950px tall, and the short band then showed a
            hugely magnified sliver of its middle. The band's height is derived
            from that same width -- the frame's 413x174 crop is a 2.37 ratio, so
            45vw is to 106vw as 238px is to 560px -- which keeps the slice
            constant instead of letting the two dimensions drift apart. */}
        <div className="relative h-[min(45vw,238px,22vh)] w-[min(106vw,560px)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/turntable_image.png"
            alt=""
            width={510}
            height={489}
            className="absolute left-1/2 top-1/2 w-full max-w-none -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      </div>
    </div>
  );
}
