/**
 * The caustic field behind the welcome.
 *
 * The look is a level set, not a blur: a smooth noise field, with light thrown
 * only where that field crosses one particular value. That is what produces the
 * web of thin bright filaments with dark lobes between them, and it is why a
 * stack of blurred gradients cannot fake it -- gradients are smooth everywhere,
 * and the whole subject here is a narrow band.
 *
 * feTurbulence gives the field and feComponentTransfer does the level set: a
 * table that peaks in the middle maps mid-grey to full brightness and everything
 * either side of it to nothing, so the ridges fall exactly where the noise
 * crosses 0.5. Two passes at different scales, because one is a flat web and two
 * read as depth -- a broad slow wash underneath, the filaments over it.
 *
 * SVG rather than WebGL: no context to lose, no render loop, nothing to ship to
 * the browser. The filter rasterises once and is then just a picture. The drift
 * is a transform on an oversized layer for the same reason -- moving a filtered
 * layer composites, whereas animating the turbulence itself would recompute the
 * whole field every frame, which is exactly the thing that makes shader
 * backgrounds janky on a phone.
 */

/** Where the light lands. The scene's accent, one step brighter. */
const VEIN = "#f6cd82";
/** The broad wash under it -- amber going to nothing at the edges of a lobe. */
const WASH = "#c2762c";

/**
 * A transfer table that is dark everywhere except a spike at the middle of the
 * input range.
 *
 * Written rather than typed out because the width of the spike is the only dial
 * that matters here and it is set by the number of entries, which a literal
 * hides: entries are spread evenly across the input, so 21 of them light the
 * band 0.45-0.55 and 41 halve that again. Since fractalNoise clusters around
 * 0.5, that width is the difference between a glow and a filament.
 */
function levelSet(entries: number): string {
  const middle = (entries - 1) / 2;
  return Array.from({ length: entries }, (_, i) => {
    const distance = Math.abs(i - middle);
    if (distance === 0) return 1;
    // One step either side, so the spike lands soft instead of aliasing.
    return distance === 1 ? 0.14 : 0;
  }).join(" ");
}

const VEIN_LEVELS = levelSet(41);

export function WelcomeShader() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: "#060504" }}
    >
      {/* Oversized and drifting, so the field moves without the filter being
          recomputed. `slice` covers like a background-size: cover image. */}
      <svg
        className="absolute -inset-[12%] h-[124%] w-[124%]"
        viewBox="0 0 320 640"
        preserveAspectRatio="xMidYMid slice"
        style={{ animation: "shaderDrift 46s ease-in-out infinite" }}
      >
        <defs>
          {/* The wash: the same field, taken broadly rather than at a level, so
              it fills the lobes the filaments outline. */}
          <filter
            id="wc-wash"
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.0045 0.0038"
              numOctaves="3"
              seed="17"
              result="field"
            />
            <feColorMatrix
              in="field"
              type="matrix"
              values="0.34 0.34 0.34 0 0
                      0.34 0.34 0.34 0 0
                      0.34 0.34 0.34 0 0
                      0    0    0    0 1"
              result="grey"
            />
            {/* A gentle shoulder rather than a spike: broad masses, not lines.
                Capped well below 1 -- this layer only has to hint at a colour
                inside the lobes, and at full strength it becomes a beige sheet
                with the filaments lost in it. */}
            <feComponentTransfer in="grey" result="mass">
              <feFuncR type="table" tableValues="0 0.16 0.42 0.16 0" />
              <feFuncG type="table" tableValues="0 0.16 0.42 0.16 0" />
              <feFuncB type="table" tableValues="0 0.16 0.42 0.16 0" />
            </feComponentTransfer>
            <feGaussianBlur in="mass" stdDeviation="6" result="soft" />
            <feColorMatrix in="soft" type="luminanceToAlpha" result="lum" />
            <feFlood floodColor={WASH} result="tint" />
            <feComposite in="tint" in2="lum" operator="in" />
          </filter>

          {/* The filaments. Same construction, a much narrower table. */}
          <filter
            id="wc-veins"
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.0062 0.0052"
              numOctaves="4"
              seed="9"
              result="field"
            />
            <feColorMatrix
              in="field"
              type="matrix"
              values="0.34 0.34 0.34 0 0
                      0.34 0.34 0.34 0 0
                      0.34 0.34 0.34 0 0
                      0    0    0    0 1"
              result="grey"
            />
            {/* The level set: light only where the field crosses the middle. */}
            <feComponentTransfer in="grey" result="ridge">
              <feFuncR type="table" tableValues={VEIN_LEVELS} />
              <feFuncG type="table" tableValues={VEIN_LEVELS} />
              <feFuncB type="table" tableValues={VEIN_LEVELS} />
            </feComponentTransfer>
            {/* Enough to give the filament a halo rather than an edge. */}
            <feGaussianBlur in="ridge" stdDeviation="1.4" result="soft" />
            <feColorMatrix in="soft" type="luminanceToAlpha" result="lum" />
            <feFlood floodColor={VEIN} result="tint" />
            <feComposite in="tint" in2="lum" operator="in" />
          </filter>
        </defs>

        <rect width="320" height="640" filter="url(#wc-wash)" opacity="0.32" />
        <rect width="320" height="640" filter="url(#wc-veins)" opacity="0.92" />
      </svg>

      {/* The card carries a name, a URL and a button, and a caustic field is a
          hostile thing to read off. This darkens the middle, where all of that
          sits, and leaves the corners bright -- the opposite of a vignette, and
          the reason the text survives at all. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(78% 46% at 50% 52%, rgba(6,5,4,0.9) 0%, rgba(6,5,4,0.66) 45%, rgba(6,5,4,0.12) 100%)",
        }}
      />
    </div>
  );
}
