"use client";

import { useEffect, useState } from "react";

/**
 * The first thing a new account sees: a record spinning up, their name, and the
 * link that now belongs to them.
 *
 * Shown once. The `?welcome=1` that triggers it is stripped from the URL as soon
 * as it plays, so a refresh or a bookmark doesn't replay the celebration -- which
 * is the difference between a welcome and a nuisance. That also means the flag
 * needs no server-side "have they seen this" column to go stale.
 *
 * It covers the screen, so it gets out of the way on its own after a beat, and
 * accepts a click, a tap, Escape or any key before that. Nothing behind it is
 * disabled: it is a curtain, not a modal, and the dashboard is fully rendered
 * underneath the whole time.
 */

/** Long enough to read the name, short enough that nobody reaches for a skip. */
const HOLD_MS = 2700;
const FADE_MS = 520;

export function WelcomeMoment({
  displayName,
  publicUrl,
}: {
  displayName: string;
  publicUrl: string;
}) {
  const [phase, setPhase] = useState<"showing" | "leaving" | "gone">("showing");

  useEffect(() => {
    // Drop the flag immediately rather than on dismissal: if they navigate away
    // mid-animation, the URL they leave behind should already be the clean one.
    const url = new URL(window.location.href);
    if (url.searchParams.has("welcome")) {
      url.searchParams.delete("welcome");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (phase !== "showing") return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const leave = () => setPhase("leaving");
    // A shorter hold when motion is refused: with nothing animating, the same
    // pause is just a blank wait in front of the page they asked for.
    const timer = setTimeout(leave, reduced ? 1400 : HOLD_MS);

    window.addEventListener("keydown", leave);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", leave);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "gone") return null;

  const leaving = phase === "leaving";

  return (
    <div
      data-welcome
      role="status"
      aria-live="polite"
      onClick={() => setPhase("leaving")}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-8 text-center"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 30%, oklch(0.22 0.02 70) 0%, oklch(0.12 0.015 65) 45%, #060504 100%)",
        animation: `${leaving ? "welcomeOut" : "welcomeIn"} ${
          leaving ? FADE_MS : 260
        }ms ease forwards`,
        // Stops the fade-out from swallowing a click meant for the dashboard.
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <div
        aria-hidden="true"
        className="relative h-24 w-24"
        style={{ animation: "discArrive 700ms cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            // The first colour is repeated at the end to close the loop. A conic
            // gradient wraps back to its start, so ending on a different value
            // leaves a hard seam running out from the centre.
            backgroundImage: `repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.14) 0 1px, transparent 1px 3px),
                              conic-gradient(from 210deg,
                                oklch(0.9 0.07 85),
                                oklch(0.72 0.09 70),
                                oklch(0.95 0.05 90),
                                oklch(0.8 0.09 80),
                                oklch(0.9 0.07 85))`,
            boxShadow: "0 0 44px oklch(0.85 0.09 82 / 0.35)",
            animation: "discSpin 2.6s cubic-bezier(0.16,0.8,0.3,1) both",
          }}
        />
        {/* Label and spindle hole, so the disc reads as a record rather than as
            a loading spinner. Sized off a real 7": the label is about a third of
            the diameter, and anything much larger starts to read as an eye. */}
        <div
          className="absolute inset-[33%] rounded-full"
          style={{ background: "oklch(0.19 0.015 66)" }}
        />
        <div
          className="absolute inset-[47.5%] rounded-full"
          style={{ background: "#060504" }}
        />
      </div>

      <div>
        <h2
          className="serif text-3xl"
          style={{ animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 240ms both" }}
        >
          Welcome, {displayName}
        </h2>
        <p
          className="mt-3 text-sm text-ink-dim"
          style={{ animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 400ms both" }}
        >
          Your shelf is live at
        </p>
        <p
          className="mt-1 text-sm font-medium text-accent"
          style={{ animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 520ms both" }}
        >
          {publicUrl}
        </p>
      </div>

      <p
        className="text-xs text-ink-faint"
        style={{ animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 900ms both" }}
      >
        Tap to continue
      </p>
    </div>
  );
}
