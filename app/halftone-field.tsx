import type { CSSProperties } from "react";

/**
 * The landing page's backdrop: a folded ribbon of red and amber, printed as a
 * halftone dot grid.
 *
 * Two layers doing two jobs. Underneath, an SVG paints the colour field as a few
 * broad curves under a heavy blur -- the blur is the point, since nothing here
 * wants a hard edge and a smooth field is what the grid has to sample. Over it,
 * a tiled radial-gradient mask punches that field into dots. Colour comes from
 * whatever the field happens to be behind each dot, so the ribbon reads through
 * the grid without a single dot being coloured by hand.
 *
 * Drawn rather than shipped as an image: at this scale a photograph of a dot
 * grid moires against the pixel grid, and a mask stays sharp at any density on
 * any screen. It also costs no request and no bytes beyond the markup.
 *
 * No client JavaScript -- gradients and a mask, so the page stays static.
 */

/** The grid's pitch. Dots are ~80% of a cell, which is the reference's spacing. */
const PITCH = "8px";

const DOT =
  "radial-gradient(circle closest-side at 50% 50%, #000 0 72%, transparent 92%)";

/**
 * A glint on each dot, offset up and left, so the grid reads as beads catching a
 * light rather than as flat punched holes. Very low contrast on purpose: at this
 * size anything stronger turns to noise.
 */
const GLINT =
  "radial-gradient(circle closest-side at 36% 32%, rgba(255,255,255,0.18), transparent 68%)";

/**
 * The swell that runs across the ribbon, right to left.
 *
 * Three bands rather than one, at unrelated speeds and on unrelated bob periods,
 * because a single band is a slide: you see its period within a few seconds and
 * it stops reading as water. Three of them beat against each other and the
 * pattern doesn't visibly repeat.
 *
 * `tile` must divide 50 exactly. Each band is twice the viewport wide and drifts
 * by half itself, so a tile of 25% travels exactly two tiles per cycle and lands
 * where it began; anything that doesn't divide evenly leaves a seam that snaps
 * once a loop.
 *
 * Only the field moves -- the dot grid above it is stationary, the way a sign
 * animates by changing what its bulbs show rather than by moving the bulbs. It
 * also keeps the dots from travelling across the pixel grid and shimmering.
 */
/**
 * The bulbs going on and off.
 *
 * Each layer is a second field of dots at a pitch a few percent off the grid's,
 * drifting across it. Because the two pitches disagree, a dot's alignment with
 * the layer above it changes from one dot to the next -- so within a band you
 * see individual dots fade up or die away in sequence, and the band itself
 * travels. That beat is the shimmer, and it comes out of the mismatch rather
 * than out of per-dot markup: a grid this fine is thousands of dots, which is
 * thousands of elements and an animation each.
 *
 * The beat repeats every pitch/mismatch pixels, so the two axes are mismatched
 * by very different amounts on purpose: ~5% across gives bands about 160px
 * apart, while ~1% down puts the vertical beat far off screen. Matching the two
 * would tile the shimmer into a lattice of identical cells, which reads as a
 * mechanical grid rather than as light moving over a surface. The layers also
 * disagree in opposite directions, so their bands never sit on top of each other
 * and pulse as one.
 *
 * `steps` is how many of its own tiles the layer travels per loop, which is what
 * keeps the loop seamless at any viewport width.
 */
const SHIMMER = [
  // Dots dying back: the backdrop's own colour, so a covered bulb reads as
  // dimmed rather than as a grey smudge laid over it. Deliberately short of
  // opaque -- fully extinguishing them punches holes in the ribbon.
  {
    tint: "rgba(8,6,5,0.55)",
    scaleX: 1.055,
    scaleY: 1.014,
    steps: 40,
    duration: "21s",
    softness: "58%",
  },
  // Dots flaring. Weaker still, because a bulb coming up brighter than the
  // ribbon behind it stops looking like part of the same surface.
  {
    tint: "oklch(0.98 0.05 82 / 0.3)",
    scaleX: 0.945,
    scaleY: 0.99,
    steps: 44,
    duration: "34s",
    softness: "52%",
  },
];

const RIPPLES = [
  {
    tint: "oklch(0.9 0.15 66 / 0.34)",
    tile: "25%",
    band: { top: "26%", height: "44%" },
    drift: "28s",
    bob: "11s",
    lift: "3.5%",
  },
  {
    tint: "oklch(0.62 0.2 28 / 0.4)",
    tile: "12.5%",
    band: { top: "8%", height: "56%" },
    drift: "17s",
    bob: "17s",
    lift: "-4.5%",
  },
  {
    tint: "oklch(0.16 0.02 40 / 0.58)",
    tile: "10%",
    band: { top: "44%", height: "48%" },
    drift: "40s",
    bob: "13s",
    lift: "4%",
  },
];

export function HalftoneField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{ "--pitch": PITCH, background: "#080605" } as CSSProperties}
    >
      <div
        className="absolute inset-0"
        style={{
          maskImage: DOT,
          WebkitMaskImage: DOT,
          maskSize: "var(--pitch) var(--pitch)",
          WebkitMaskSize: "var(--pitch) var(--pitch)",
          maskRepeat: "repeat",
          WebkitMaskRepeat: "repeat",
        }}
      >
        {/* `slice` so the composition covers like a background-size: cover image
            instead of letterboxing into a window it was never drawn for. */}
        <svg
          className="h-full w-full"
          viewBox="0 0 736 1472"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="hf-red" x1="0" y1="0" x2="0.7" y2="1">
              <stop offset="0" stopColor="#e62c11" />
              <stop offset="0.55" stopColor="#f23c1c" />
              <stop offset="1" stopColor="#c11f08" />
            </linearGradient>
            <linearGradient id="hf-gold" x1="0" y1="0" x2="1" y2="0.55">
              <stop offset="0" stopColor="#e8701f" />
              <stop offset="0.5" stopColor="#f7a836" />
              <stop offset="1" stopColor="#ffd979" />
            </linearGradient>
            <linearGradient id="hf-ember" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0" stopColor="#f6b243" />
              <stop offset="1" stopColor="#c9350f" />
            </linearGradient>

            {/* One blur over everything, rather than per shape: the shapes only
                have to be roughly right, and the field they melt into is what
                the dots actually sample. */}
            <filter
              id="hf-soften"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="17" />
            </filter>
          </defs>

          {/* Not pure black: the shadows still have to show dots, so the darkest
              tone sits just above the backdrop behind the grid rather than on it. */}
          <rect width="736" height="1472" fill="#171010" />

          <g filter="url(#hf-soften)">
            {/* The ribbon's lit face: two crests along the top, falling away to
                the right so the top corner stays in shadow. */}
            <path
              d="M -40 168
                 C 20 112, 96 92, 158 122
                 C 214 150, 250 166, 300 152
                 C 358 134, 420 166, 486 240
                 C 566 330, 656 408, 776 438
                 L 776 918
                 C 660 872, 528 772, 436 664
                 C 348 562, 244 516, 152 558
                 C 88 588, 34 646, -40 706
                 Z"
              fill="url(#hf-red)"
            />

            {/* The fold itself. The bright edge is the whole reason the shape
                reads as folded rather than as a flat wash. */}
            <path
              d="M 436 664
                 C 528 772, 660 872, 776 918
                 L 776 1010
                 C 636 962, 496 846, 396 716
                 C 366 676, 380 640, 412 636
                 Z"
              fill="url(#hf-gold)"
            />

            {/* The glancing catch of the same light where the ribbon turns over
                at the left edge. */}
            <path
              d="M -40 560
                 C 20 512, 92 500, 150 520
                 C 120 556, 60 612, -40 660
                 Z"
              fill="url(#hf-ember)"
              opacity="0.85"
            />

            {/* The shaded underside, and then the trough below it -- two waves
                rather than one, so the lower half has somewhere to fall away to. */}
            <path
              d="M -40 742
                 C 60 668, 196 686, 306 774
                 C 430 872, 574 972, 776 1042
                 L 776 1512
                 L -40 1512
                 Z"
              fill="#3a1d13"
            />
            <path
              d="M -40 946
                 C 76 866, 214 906, 340 1006
                 C 486 1120, 618 1188, 776 1232
                 L 776 1512
                 L -40 1512
                 Z"
              fill="#150d0a"
            />
          </g>
        </svg>

        {/* Inside the mask, over the field: the swell is dotted along with
            everything else, so it reads as the grid changing rather than as a
            sheet of light sliding across the top of it. */}
        {RIPPLES.map(({ tint, tile, band, drift, bob, lift }) => (
          <div
            key={drift}
            className="absolute left-0 w-[200%]"
            style={{
              top: band.top,
              height: band.height,
              animation: `rippleDrift ${drift} linear infinite`,
              willChange: "transform",
            }}
          >
            {/* The bob is a second element so it composes with the drift instead
                of overwriting it -- two animations on one element would each set
                `transform` and the last one declared would win. */}
            <div
              className="h-full w-full"
              style={
                {
                  "--lift": lift,
                  animation: `rippleBob ${bob} ease-in-out infinite`,
                  backgroundImage: `radial-gradient(ellipse 52% 58% at 50% 50%, ${tint}, transparent 70%)`,
                  backgroundSize: `${tile} 100%`,
                  backgroundRepeat: "repeat-x",
                } as CSSProperties
              }
            />
          </div>
        ))}

        {/* Wider than the container by exactly its own travel, so its right edge
            starts off-screen and there is always pattern to drift in from. */}
        {SHIMMER.map(({ tint, scaleX, scaleY, steps, duration, softness }) => (
          <div
            key={duration}
            className="absolute inset-y-0 left-0"
            style={
              {
                "--tile": `calc(var(--pitch) * ${scaleX})`,
                "--travel": `calc(var(--tile) * -${steps})`,
                width: `calc(100% + var(--tile) * ${steps})`,
                backgroundImage: `radial-gradient(circle closest-side at 50% 50%, ${tint} 0 ${softness}, transparent 84%)`,
                backgroundSize: `var(--tile) calc(var(--pitch) * ${scaleY})`,
                backgroundRepeat: "repeat",
                animation: `shimmerDrift ${duration} linear infinite`,
                willChange: "transform",
              } as CSSProperties
            }
          />
        ))}

        {/* Glint rides above the field but inside the same mask, so it lands on
            the dots and never in the gaps between them. */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: GLINT,
            backgroundSize: "var(--pitch) var(--pitch)",
            backgroundRepeat: "repeat",
          }}
        />
      </div>

      {/* The reference is a wallpaper, with nothing to read on top of it. This
          page has a headline and 15px copy over the ribbon's brightest corner.
          A scrim across the whole field buys the contrast back but costs the
          red its vividness, which is most of what the reference is -- so this
          one is local: an ellipse over the text block only, plus a little at
          the very top and foot. The fold keeps its full brightness, because
          nothing is set over it. */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(124% 44% at 4% 25%, rgba(8,6,5,0.8) 0%, rgba(8,6,5,0.52) 44%, rgba(8,6,5,0) 78%),
                       linear-gradient(180deg, rgba(8,6,5,0.42) 0%, rgba(8,6,5,0) 20%, rgba(8,6,5,0) 60%, rgba(8,6,5,0.5) 88%, rgba(8,6,5,0.7) 100%)`,
        }}
      />
    </div>
  );
}
