"use client";

import { useEffect, useRef } from "react";

/**
 * The first thing a new account sees: a record spinning up, their name, and the
 * link that now belongs to them.
 *
 * It waits. Nothing dismisses it but the person in front of it -- a timer would
 * contradict the words on the screen, and it did: this used to promise "tap to
 * continue" and then leave on its own after a beat.
 *
 * Because it waits, it is a real modal rather than a div over the page, and gets
 * focus trapping, Escape and an inert background from showModal() instead of
 * from hand-written listeners. Without support for that the dialog simply never
 * opens and the dashboard is there as usual, which is the right way for a
 * flourish to fail.
 *
 * Shown once: the `?welcome=1` that triggers it is stripped from the URL as soon
 * as it appears, so a refresh or a bookmark doesn't replay the celebration --
 * which is the difference between a welcome and a nuisance, and saves a
 * "have they seen this" column that would only go stale.
 */
export function WelcomeMoment({
  displayName,
  publicUrl,
}: {
  displayName: string;
  publicUrl: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Dropped as it opens, not as it closes: if they navigate away mid-welcome,
    // the URL left in history should already be the clean one.
    const url = new URL(window.location.href);
    if (url.searchParams.has("welcome")) {
      url.searchParams.delete("welcome");
      window.history.replaceState(null, "", url.pathname + url.search);
    }

    dialog.current?.showModal?.();
  }, []);

  const dismiss = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      data-welcome
      className="welcome"
      aria-labelledby="welcome-title"
      // The whole surface dismisses, so nobody has to find the button. It sits
      // on the dialog rather than on an inner wrapper because the dialog is what
      // fills the screen.
      onClick={dismiss}
    >
      <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
        <div
          aria-hidden="true"
          className="relative h-24 w-24"
          style={{
            animation: "discArrive 700ms cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {/* Two nested rotations that compose: the outer comes up to speed and
              settles, the inner keeps turning for as long as the card is open.
              They have to be separate elements -- both animate `rotate`, and on
              one element the later animation would just replace the earlier. */}
          <div
            className="absolute inset-0"
            style={{
              animation: "discSpinUp 2.6s cubic-bezier(0.16,0.8,0.3,1) both",
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{
                // The first colour is repeated at the end to close the loop. A
                // conic gradient wraps back to its start, so ending on a
                // different value leaves a hard seam running out from the centre.
                backgroundImage: `repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.14) 0 1px, transparent 1px 3px),
                                  conic-gradient(from 210deg,
                                    oklch(0.9 0.07 85),
                                    oklch(0.72 0.09 70),
                                    oklch(0.95 0.05 90),
                                    oklch(0.8 0.09 80),
                                    oklch(0.9 0.07 85))`,
                boxShadow: "0 0 44px oklch(0.85 0.09 82 / 0.35)",
                // Nine seconds a revolution. A real LP turns in under two, which
                // at this size reads as spinning rather than as turning.
                animation: "discSpin 9s linear infinite",
              }}
            />
          </div>
          {/* Label and spindle hole, so the disc reads as a record rather than
              as a loading spinner. Sized off a real 7": the label is about a
              third of the diameter, and much larger starts to read as an eye. */}
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
            id="welcome-title"
            className="heading text-3xl"
            style={{
              animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 240ms both",
            }}
          >
            Welcome, {displayName}
          </h2>
          <p
            className="mt-3 text-sm text-ink-dim"
            style={{
              animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 400ms both",
            }}
          >
            Your shelf is live at
          </p>
          <p
            className="mt-1 text-sm font-medium text-accent"
            style={{
              animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 520ms both",
            }}
          >
            {publicUrl}
          </p>
        </div>

        {/* A real button, not a caption. It is the only way out for anyone not
            using a pointer, and showModal() puts focus on it. */}
        <button
          type="button"
          onClick={dismiss}
          className="btn-ghost !px-5 !py-2 !text-xs"
          style={{
            animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 900ms both",
          }}
        >
          Tap to continue
        </button>
      </div>
    </dialog>
  );
}
