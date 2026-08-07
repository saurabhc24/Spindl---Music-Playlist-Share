/**
 * A wall of album covers, drifting.
 *
 * Rows alternate direction so the eye never settles on a single sweep, and the
 * panel's edges dissolve rather than ending on a hard line -- covers slide out of
 * focus before they slide out of frame.
 *
 * No client JavaScript: the movement is one keyframe per direction and the blur
 * is layered backdrop-filter, so this stays inside a server component and the
 * landing page stays statically prerendered.
 */

const COVERS = Array.from(
  { length: 30 },
  (_, i) => `/covers/cover-${String(i + 1).padStart(2, "0")}.jpg`
);

// Three rows of ten. Each is rendered twice back to back and travels exactly
// half its own width, so the second copy lands where the first began and the
// loop has no seam.
const ROWS = [COVERS.slice(0, 10), COVERS.slice(10, 20), COVERS.slice(20, 30)];

/** Slightly different speeds, so the rows never line up into a single block. */
const DURATIONS = ["44s", "58s", "50s"];

export function CoverWall() {
  return (
    <div
      aria-hidden="true"
      className="relative min-h-0 w-full flex-1 select-none overflow-hidden rounded-[18px]"
    >
      <div className="flex h-full flex-col justify-center gap-[2%]">
        {ROWS.map((row, index) => (
          <div key={index} className="relative min-h-0 flex-1 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 flex w-max gap-[6px]"
              style={{
                animation: `wallScroll ${DURATIONS[index]} linear infinite`,
                // Odd rows run the other way, which is the whole effect.
                animationDirection: index % 2 === 1 ? "reverse" : "normal",
              }}
            >
              {[...row, ...row].map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt=""
                  width={300}
                  height={300}
                  loading="lazy"
                  // Height-driven so the wall reflows into whatever vertical
                  // space is left, rather than dictating its own size.
                  className="h-full w-auto rounded-[4px] object-cover blur-[1.1px]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progressive blur: several passes, each masked to reach further in than
          the last, so sharpness falls away toward the edges instead of stepping
          down once. A single blurred overlay reads as a smeared border; this
          reads as depth. */}
      {[
        { blur: "2px", stop: "26%" },
        { blur: "6px", stop: "15%" },
        { blur: "14px", stop: "7%" },
      ].map(({ blur, stop }) => (
        <div
          key={blur}
          className="pointer-events-none absolute inset-0"
          style={{
            backdropFilter: `blur(${blur})`,
            WebkitBackdropFilter: `blur(${blur})`,
            maskImage: `linear-gradient(to right, #000, transparent ${stop}, transparent calc(100% - ${stop}), #000),
                        linear-gradient(to bottom, #000, transparent ${stop}, transparent calc(100% - ${stop}), #000)`,
            WebkitMaskImage: `linear-gradient(to right, #000, transparent ${stop}, transparent calc(100% - ${stop}), #000),
                              linear-gradient(to bottom, #000, transparent ${stop}, transparent calc(100% - ${stop}), #000)`,
            maskComposite: "add",
            WebkitMaskComposite: "source-over",
          }}
        />
      ))}

      {/* And a darkening vignette on top, so the wall emerges from the room
          rather than sitting on it as a rectangle. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, transparent 34%, rgba(6,5,4,0.72) 78%, #060504 100%)",
        }}
      />
    </div>
  );
}
