"use client";

import { useEffect, useRef } from "react";

/**
 * The first thing a new account sees: a record spinning up, their name, and the
 * handle that now belongs to them.
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
  handle,
}: {
  displayName: string;
  handle: string;
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
      <div className="relative flex h-full flex-col items-center justify-center px-8 pb-[16.5vh] text-center">
        <div
          aria-hidden="true"
          className="relative h-[136px] w-[136px]"
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
                // Grooves you can count rather than a texture, at one ring
                // every six pixels -- about nine of them between the centre and
                // the edge, which is what the reference shows. Much tighter and
                // they collapse into a hatch.
                //
                // The first colour is repeated at the end to close the loop. A
                // conic gradient wraps back to its start, so ending on a
                // different value leaves a hard seam running out from the centre.
                backgroundImage: `repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.18) 0 1px, transparent 1px 6px),
                                  conic-gradient(from 210deg,
                                    oklch(0.91 0.06 86),
                                    oklch(0.85 0.07 80),
                                    oklch(0.93 0.05 88),
                                    oklch(0.87 0.07 82),
                                    oklch(0.91 0.06 86))`,
                // Two shadows: a tight one that reads as the disc catching the
                // light, and a broad one for the halo the reference throws well
                // past the record's own edge.
                boxShadow:
                  "0 0 34px oklch(0.88 0.09 84 / 0.30), 0 0 110px oklch(0.82 0.10 80 / 0.26)",
                // Nine seconds a revolution. A real LP turns in under two, which
                // at this size reads as spinning rather than as turning.
                animation: "discSpin 9s linear infinite",
              }}
            />
          </div>
          {/* One dark centre rather than a label with a spindle hole punched in
              it. At this size the hole was a speck, and two rings inside each
              other read as a target -- a single well is cleaner and is what the
              design asks for. */}
          <div
            className="absolute inset-[34.5%] rounded-full"
            style={{ background: "#000" }}
          />
        </div>

        <div className="mt-[88px]">
          <h2
            id="welcome-title"
            className="heading text-[34px] font-bold leading-tight"
            style={{
              animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 240ms both",
            }}
          >
            {/* Two lines by construction, not by wrapping: a short name would
                otherwise sit on one line and lose the shape entirely. */}
            Welcome
            <br />
            {displayName}
          </h2>
          <p
            className="mt-8 text-base text-ink"
            style={{
              animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 420ms both",
            }}
          >
            Your shelf is live:{" "}
            <span className="text-accent">@{handle}</span>
          </p>
        </div>

        {/* A real button, not a caption. It is the only way out for anyone not
            using a pointer, and showModal() puts focus on it. */}
        <button
          type="button"
          onClick={dismiss}
          className="btn-ghost mt-[34px] !px-8 !py-3 !text-sm"
          style={{
            animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 700ms both",
          }}
        >
          Tap to continue
        </button>

        {/* Sits at the foot rather than in the centred stack, so it reads as the
            product signing the moment rather than as another line of the card. */}
        <span
          className="wordmark absolute bottom-[50px] text-[20px] tracking-wide"
          style={{
            animation: "riseIn 620ms cubic-bezier(0.22,1,0.36,1) 900ms both",
          }}
        >
          SpindlShare
        </span>
      </div>
    </dialog>
  );
}
