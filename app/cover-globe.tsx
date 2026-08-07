import type { CSSProperties } from "react";

/**
 * A globe of album covers, turning.
 *
 * Covers ride latitude bands on a sphere rather than scrolling in straight
 * lines. Every band turns at the same angular rate, which is what makes it read
 * as one solid body: the equator sweeps past quickly, the poles barely move, and
 * a cover slows and narrows to nothing as it reaches the silhouette. That
 * foreshortening is the reason the far side never has to be hidden by hand --
 * `backface-visibility` drops it, and each cover has already compressed to zero
 * width by the time it gets there, so nothing pops in or out.
 *
 * Sharp through the middle, dissolving at the rim: the fade is a radial mask on
 * the content itself, and the blur is three passes layered over it, each masked
 * to start further out than the last. Keeping those separate matters -- the
 * blur is backdrop-filter, which mobile browsers may decline, and the globe
 * still has to fade correctly when they do.
 *
 * No client JavaScript. The geometry below resolves to static transforms at
 * render time and the turn is one keyframe, so this stays a server component and
 * the landing page stays statically prerendered.
 */

const COVERS = Array.from(
  { length: 30 },
  (_, i) => `/covers/cover-${String(i + 1).padStart(2, "0")}.jpg`
);

/**
 * Latitude bands, north to south.
 *
 * `count` is roughly that band's circumference divided by a cover, so the tiles
 * meet edge to edge at every latitude instead of crowding at the poles -- which
 * is why the polar bands hold half what the equator does. `turn` offsets a band
 * so the five don't line up into visible columns; it's a fixed rotation rather
 * than an animation-delay so the scatter survives prefers-reduced-motion, which
 * freezes every band at its starting angle.
 */
const BANDS = [
  { lat: 61.6, count: 5, turn: 0 },
  { lat: 26.1, count: 10, turn: 17 },
  { lat: 0, count: 11, turn: 9 },
  { lat: -26.1, count: 10, turn: 24 },
  { lat: -61.6, count: 5, turn: 31 },
];

/** One full rotation. Ambient, not a carousel -- nobody should watch it finish. */
const ROTATION = "72s";

/**
 * Where the globe stops being. Sized `closest-side`, so 100% is half the box
 * regardless of it being square -- the default (farthest-corner) would put the
 * fade out past the diagonal and leave the rim hard.
 */
const FADE =
  "radial-gradient(circle closest-side at 50% 50%, #000 0 50%, transparent 100%)";

/**
 * Each pass reaches further in than the last, so focus falls away instead of
 * stepping down once. The first pass is still clear of the two inner bands, so
 * the middle of the globe stays sharp -- the falloff is all in the outer half,
 * which is also the half that overhangs the copy.
 */
const HAZE = [
  { blur: "2px", clear: "46%", full: "74%" },
  { blur: "5px", clear: "62%", full: "86%" },
  { blur: "10px", clear: "78%", full: "98%" },
];

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function CoverGlobe() {
  // Runs across every band, so neighbouring covers are never the same artwork.
  let nth = 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 select-none"
      style={
        {
          // Capped against height as well as width. Not only because a
          // landscape phone has plenty of vw and no height to spend it in: the
          // copy sits a fixed distance above the globe's centre, so on a short
          // screen a *larger* globe is the worse one -- it puts that fixed
          // distance nearer the sharp middle instead of out in the faded rim.
          // 32vh keeps the text past the falloff on a 667px phone.
          "--globe": "min(76vw, 35vh, 310px)",
          "--r": "calc(var(--globe) * 0.36)",
          "--cover": "calc(var(--globe) * 0.2)",
          width: "var(--globe)",
          height: "var(--globe)",
        } as CSSProperties
      }
    >
      {/* The fade sits on its own wrapper rather than on the element below it.
          A mask and `transform-style` on one element fight -- the mask forces
          the element flat, which would collapse the sphere into a disc. */}
      <div
        className="absolute inset-0"
        style={{ maskImage: FADE, WebkitMaskImage: FADE }}
      >
        <div
          className="absolute inset-0"
          style={{ perspective: "calc(var(--globe) * 2.4)" }}
        >
          {BANDS.map(({ lat, count, turn }) => {
            const angle = radians(lat);
            // North is up, and up is negative y.
            const rise = (-Math.sin(angle)).toFixed(4);
            const reach = Math.cos(angle).toFixed(4);

            return (
              <div
                key={lat}
                className="absolute inset-0"
                style={{
                  transformStyle: "preserve-3d",
                  transform: `translateY(calc(var(--r) * ${rise})) rotateY(${turn}deg)`,
                }}
              >
                {/* Turning this turns the whole ring about the sphere's axis:
                    it shares the band's centre, so it rotates about the pole
                    rather than about itself. Full-size rather than a bare point
                    at that centre, which is the obvious way to write it and is
                    wrong -- preflight gives every img `max-width: 100%`, and
                    100% of a zero-width parent is zero, so the covers collapse
                    to nothing. `max-w-none` below makes them independent of
                    this, but a real box is the honest containing block. */}
                <div
                  className="absolute inset-0"
                  style={{
                    transformStyle: "preserve-3d",
                    animation: `globeTurn ${ROTATION} linear infinite`,
                  }}
                >
                  {Array.from({ length: count }, (_, i) => {
                    const src = COVERS[nth++ % COVERS.length];
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt=""
                        width={300}
                        height={300}
                        loading="lazy"
                        decoding="async"
                        className="absolute left-1/2 top-1/2 max-w-none rounded-[3px] object-cover [backface-visibility:hidden]"
                        style={{
                          width: "var(--cover)",
                          height: "var(--cover)",
                          // Centres the tile on the ring point, so it pivots
                          // about its own middle rather than its corner.
                          marginLeft: "calc(var(--cover) / -2)",
                          marginTop: "calc(var(--cover) / -2)",
                          // Ride the ring, then lie flat against the surface:
                          // without the last term every tile stands upright,
                          // the polar bands read as wide as the equator, and
                          // the whole thing is a cushion rather than a body.
                          transform: `rotateY(${((360 / count) * i).toFixed(3)}deg) translateZ(calc(var(--r) * ${reach})) rotateX(${lat}deg)`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {HAZE.map(({ blur, clear, full }) => (
        <div
          key={blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${blur})`,
            WebkitBackdropFilter: `blur(${blur})`,
            maskImage: `radial-gradient(circle closest-side at 50% 50%, transparent ${clear}, #000 ${full})`,
            WebkitMaskImage: `radial-gradient(circle closest-side at 50% 50%, transparent ${clear}, #000 ${full})`,
          }}
        />
      ))}

      {/* Light from above left and a shaded limb opposite it. Without these the
          silhouette reads as a disc of covers; with them it reads as a body.
          Masked to the same falloff, or the gradients would paint their own
          square corners over the room. */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: FADE,
          WebkitMaskImage: FADE,
          background: `radial-gradient(circle closest-side at 62% 76%, transparent 22%, oklch(0.09 0.01 60 / 0.55) 92%),
                       radial-gradient(circle closest-side at 34% 26%, oklch(0.92 0.07 86 / 0.16), transparent 56%)`,
        }}
      />
    </div>
  );
}
