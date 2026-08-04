"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A vinyl record, drawn rather than photographed.
 *
 * The photograph it replaces had its highlights baked in, so rotating it turned
 * the reflections with the disc -- which is exactly what a real record does not
 * do. Here the light is fixed and only the surface moves beneath it, so the
 * sheen sits still while the grooves stream through it.
 *
 * Drawn with one fragment shader rather than a 3D library. There is no scene to
 * manage -- a single disc, one fixed light, no camera motion -- and a library
 * would add a few hundred kilobytes to the first page a visitor sees for
 * geometry that is two lines of trigonometry. Procedural grooves are also sharp
 * at any size, which the 350px photograph was not once it was scaled up, and
 * they cost no download at all.
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform float uTime;

const float DISC_R  = 0.985;
const float LABEL_R = 0.315;
const float HOLE_R  = 0.024;

// Groove pitch. High enough to read as a record, and the derivative-based fade
// below stops it aliasing into moire when the disc is drawn small.
const float PITCH = 520.0;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);

  // Every derivative in this shader is taken in uniform control flow -- there is
  // no discard above them. fwidth() inside a branch is undefined in GLSL and
  // produces driver-dependent speckling along exactly the edges being smoothed.
  // The cutout is done with alpha instead, which costs a few shaded fragments
  // outside the disc and nothing else.
  float edge = max(fwidth(r), 1e-5) * 1.5;
  float disc = 1.0 - smoothstep(DISC_R - edge, DISC_R, r);

  float ang = atan(p.y, p.x);
  float rot = uTime;

  vec2 radial  = p / max(r, 1e-5);
  vec2 tangent = vec2(-radial.y, radial.x);

  // A record is one continuous spiral, not a stack of rings: the pattern has to
  // depend on angle as well as radius, or rotation would be invisible because
  // concentric circles look identical from every angle.
  float spiral = r * PITCH + (ang + rot) * 2.0;

  // Fade the grooves out wherever a pixel spans more than about half a cycle.
  // Without this the centre turns to moire on a high-density screen.
  float density = fwidth(spiral);
  float legible = 1.0 - smoothstep(1.2, 3.0, density);

  float groove = sin(spiral) * legible;

  // Tilt the normal across the groove, never along it.
  vec3 n = normalize(vec3(radial * groove * 0.22, 1.0));

  // The light sits above and slightly to the left, in screen space, and does
  // not rotate. This is the whole point: the disc turns underneath it.
  vec3 L = normalize(vec3(-0.28, 0.62, 0.73));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);

  // Anisotropic highlight (Kajiya-Kay). Vinyl's sheen smears along the groove
  // into a long band rather than gathering into a round dot, and that band is
  // most of what makes the material legible as a record.
  vec3  T = normalize(vec3(tangent, 0.0));
  float TdotH = dot(T, H);
  float sheen = pow(max(0.0, sqrt(max(0.0, 1.0 - TdotH * TdotH))), 46.0);

  float diffuse = max(dot(n, L), 0.0);

  // Base plastic: near-black, faintly cool, darkening toward the rim.
  vec3 base = mix(vec3(0.055, 0.056, 0.062), vec3(0.021, 0.021, 0.026), r);

  // Broad soft reflection of the light source itself, fixed in place.
  float bounce = pow(max(0.0, dot(normalize(vec3(p * 0.55, 1.0)), L)), 3.4);

  vec3 col = base;
  col += base * diffuse * 0.55;
  col += vec3(1.0, 0.98, 0.94) * sheen * 0.85 * (0.35 + 0.65 * legible);
  col += vec3(0.85, 0.87, 0.95) * bounce * 0.13;
  col += vec3(0.6, 0.62, 0.7) * groove * 0.012;

  // Rim: a lit edge on the light side, as a thick disc catches.
  float rim = smoothstep(DISC_R - 0.045, DISC_R - 0.004, r);
  col += vec3(0.9, 0.9, 0.95) * rim * pow(max(0.0, dot(radial, L.xy)), 2.0) * 0.30;

  // ---- label ---------------------------------------------------------------
  float labelMask = 1.0 - smoothstep(LABEL_R - edge * 1.4, LABEL_R, r);
  if (labelMask > 0.001) {
    float lr = r / LABEL_R;
    vec3 label = mix(vec3(0.74, 0.10, 0.11), vec3(0.55, 0.06, 0.08), lr);

    // Two printed rings, and one radial tick — the tick is what makes rotation
    // read at a glance once the grooves are too fine to follow.
    float ring = smoothstep(0.02, 0.0, abs(lr - 0.62)) + smoothstep(0.02, 0.0, abs(lr - 0.72));
    label = mix(label, vec3(0.92, 0.84, 0.68), ring * 0.5);

    float tickAngle = mod(ang + rot + 3.14159, 6.28318) - 3.14159;
    float tick = smoothstep(0.05, 0.0, abs(tickAngle)) * smoothstep(0.42, 0.5, lr) * (1.0 - smoothstep(0.86, 0.94, lr));
    label = mix(label, vec3(0.95, 0.88, 0.72), tick * 0.65);

    // Paper is matte: it keeps the soft bounce but not the anisotropic sheen.
    label += vec3(1.0) * bounce * 0.10;
    label += label * diffuse * 0.25;

    col = mix(col, label, labelMask);
  }

  // ---- spindle hole --------------------------------------------------------
  float hole = 1.0 - smoothstep(HOLE_R - edge * 1.4, HOLE_R, r);
  col = mix(col, vec3(0.02, 0.02, 0.025), hole);

  outColor = vec4(col, disc);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function VinylRecord({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Starts false so server-rendered HTML shows only the gradient disc behind
  // this; the canvas fades in once a context and a compiled program exist.
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // No WebGL2: the gradient disc behind stays.

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const position = gl.getAttribLocation(program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    setLive(true);

    // Square buffer, capped: this is a decorative element and there is no reason
    // to shade four times the pixels on a 3x screen.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.round(canvas.clientWidth * dpr);
      if (size > 0 && canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
        gl.viewport(0, 0, size, size);
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const stillPreferred = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let raf = 0;
    let last = performance.now();
    // Not from zero: a record caught mid-turn looks placed rather than reset.
    let angle = 0.8;

    const frame = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!stillPreferred && !document.hidden) angle += delta * 0.62;
      gl.uniform1f(uTime, angle);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-auto w-full"
        style={{ aspectRatio: "1 / 1", opacity: live ? 1 : 0 }}
      />
    </div>
  );
}
