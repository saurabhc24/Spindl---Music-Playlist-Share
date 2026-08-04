"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * A vinyl record, drawn rather than photographed.
 *
 * The photograph it replaces had its highlights baked in, so turning it turned
 * the reflections with the disc -- the one thing a real record never does. Here
 * the light is fixed and only the surface moves beneath it: the sheen stays put
 * and the grooves travel through it.
 *
 * Three.js drives a single quad with a custom material. There is no scene to
 * speak of -- one disc, one light, no camera motion -- so the work is all in the
 * shader, and three.js handles the context, the resize and the render loop.
 */

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  // The quad already spans clip space, so no projection is needed.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
uniform float uAngle;

const float DISC_R  = 0.985;
const float LABEL_R = 0.315;
const float HOLE_R  = 0.023;

// Roughly 90 turns across the radius, which is about what a 12" LP shows at this
// size: fine enough to read as grooves, coarse enough to survive being drawn a
// few pixels apart.
const float PITCH = 560.0;

// The wider rings a record shows between tracks. Concentric, so they stay put as
// the disc turns -- which is correct, because on a real record they do.
const float BANDS = 13.0;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);

  // Every derivative here is taken in uniform control flow. fwidth() inside a
  // branch is undefined in GLSL and speckles exactly the edges it is smoothing,
  // so the cutout is done with alpha rather than discard.
  float edge = max(fwidth(r), 1e-5) * 1.5;
  float disc = 1.0 - smoothstep(DISC_R - edge, DISC_R, r);

  float ang = atan(p.y, p.x);

  vec2 radial  = p / max(r, 1e-5);
  vec2 tangent = vec2(-radial.y, radial.x);

  // A record is one continuous spiral, not a stack of rings: the pattern must
  // depend on angle as well as radius, or rotation would be invisible because
  // concentric circles look identical from every angle.
  float spiral = r * PITCH + (ang + uAngle) * 3.0;

  // Fade the groove wherever a pixel spans more than about half a cycle, or the
  // inner radius turns to moire on a dense screen.
  float legible = 1.0 - smoothstep(1.1, 2.6, fwidth(spiral));
  float groove  = sin(spiral) * legible;

  // Track separations: a few wider, darker rings laid over the fine pitch.
  float bandWave = sin(r * BANDS * 6.28318);
  float band     = smoothstep(0.86, 1.0, abs(bandWave));

  // Normal tilted across the groove wall, never along it.
  vec3 n = normalize(vec3(radial * groove * 0.9, 1.0));

  // Fixed in screen space, above and a little to the left. The disc turns
  // underneath it; the light does not move.
  vec3 L = normalize(vec3(-0.30, 0.60, 0.74));
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);

  // Anisotropic highlight (Kajiya-Kay). Vinyl smears its sheen ALONG the groove
  // into a long band rather than gathering it into a round dot, and that band is
  // most of what identifies the material as a record.
  vec3  T = normalize(vec3(tangent, 0.0));
  float TdotH = dot(T, H);
  float sheen = pow(max(0.0, sqrt(max(0.0, 1.0 - TdotH * TdotH))), 26.0);

  // The broad soft reflection of the source itself: the wide bright sweep across
  // one side of a glossy record. Also fixed.
  float sweep = pow(max(0.0, dot(normalize(vec3(p * 0.75, 1.0)), L)), 2.2);

  // Grooves are near-invisible in shadow and strongly contrasted under the
  // light, exactly as on a real disc. Driving their contrast from the lighting
  // is what makes them read as grooves; a flat modulation just looks like noise
  // on black plastic, which is how the first attempt failed.
  float lit = sheen * 0.75 + sweep * 0.85;
  float grooveContrast = groove * (0.045 + 1.15 * lit);

  float shade = max(dot(n, L), 0.0);

  vec3 base = mix(vec3(0.050, 0.051, 0.058), vec3(0.017, 0.017, 0.021), r);

  vec3 col = base;
  col += base * shade * 0.35;
  col += vec3(0.86, 0.88, 0.95) * sweep * 0.30;
  col += vec3(1.00, 0.99, 0.96) * sheen * 1.15;
  col += vec3(0.80, 0.83, 0.92) * grooveContrast;
  col -= vec3(0.35, 0.36, 0.40) * band * (0.05 + 0.55 * lit);

  // A thick disc catches light along its outer edge.
  float rim = smoothstep(DISC_R - 0.05, DISC_R - 0.004, r);
  col += vec3(0.92, 0.93, 0.98) * rim * pow(max(0.0, dot(radial, L.xy)), 2.0) * 0.42;

  // ---- label ---------------------------------------------------------------
  float labelMask = 1.0 - smoothstep(LABEL_R - edge * 1.4, LABEL_R, r);
  float lr = r / LABEL_R;
  vec3 label = mix(vec3(0.80, 0.11, 0.12), vec3(0.60, 0.06, 0.08), lr);

  // Printed rings, plus one radial tick so rotation still reads once the grooves
  // are too fine to follow individually.
  float ring = smoothstep(0.022, 0.0, abs(lr - 0.60))
             + smoothstep(0.022, 0.0, abs(lr - 0.71));
  label = mix(label, vec3(0.95, 0.88, 0.74), ring * 0.45);

  float tickAngle = mod(ang + uAngle + 3.14159, 6.28318) - 3.14159;
  float tick = smoothstep(0.045, 0.0, abs(tickAngle))
             * smoothstep(0.40, 0.48, lr)
             * (1.0 - smoothstep(0.84, 0.93, lr));
  label = mix(label, vec3(0.97, 0.90, 0.76), tick * 0.6);

  // Paper is matte: it takes the broad sweep but not the anisotropic sheen.
  label += vec3(1.0) * sweep * 0.16;

  col = mix(col, label, labelMask);

  // ---- spindle hole --------------------------------------------------------
  float hole = 1.0 - smoothstep(HOLE_R - edge * 1.4, HOLE_R, r);
  col = mix(col, vec3(0.015, 0.015, 0.019), hole);

  gl_FragColor = vec4(col, disc);
}`;

export function VinylRecord({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return; // No WebGL at all: the gradient disc behind stays.
    }

    renderer.setClearColor(0x000000, 0);
    // Capped: a decorative element has no business shading four times the pixels
    // on a 3x screen.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = { uAngle: { value: 0.8 } };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    const resize = () => {
      const size = canvas.clientWidth;
      if (size > 0) renderer.setSize(size, size, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const stillPreferred = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let last = performance.now();
    renderer.setAnimationLoop(() => {
      const now = performance.now();
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;
      if (!stillPreferred && !document.hidden) {
        uniforms.uAngle.value += delta * 0.6;
      }
      renderer.render(scene, camera);
    });

    // Revealed by touching the element rather than through state: this is one
    // boolean that only ever goes true, and rendering the tree again to carry it
    // buys nothing. Until it fires -- no WebGL, or a shader that will not
    // compile -- the gradient disc behind shows through.
    canvas.style.opacity = "1";

    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-auto w-full"
        style={{ aspectRatio: "1 / 1", opacity: 0, transition: "opacity 0.4s" }}
      />
    </div>
  );
}
