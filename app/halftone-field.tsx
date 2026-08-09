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
