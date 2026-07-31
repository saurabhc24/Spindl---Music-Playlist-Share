"use client";

import { useEffect, useState } from "react";

import { playlistEmbed } from "@/lib/playlist-embed";

import type { ShowcaseItem } from "./showcase";

/**
 * The slide-up detail view: a turntable, and the provider's own player beneath it.
 *
 * The design's transport controls and per-track list are not built, because the
 * data behind them does not exist for Spotify -- /v1/playlists/{id}/tracks answers
 * 403 under an app token and the playlist response nulls its `tracks` field, so
 * titles, artists and durations are precisely what cannot be obtained. Driving a
 * bar with a timer instead, as the mock does, would show progress unrelated to
 * what anyone is hearing. The embed carries the real controls and the real track
 * list, and is the only thing here that makes sound.
 */
export function PlayerOverlay({
  item,
  gradient,
  dotColor,
  onClose,
}: {
  item: ShowcaseItem | null;
  gradient: string;
  dotColor: string;
  onClose: () => void;
}) {
  // Which playlist the iframe has been cleared to load. Held as an id rather
  // than a boolean so closing needs no state reset at all -- `mounted` simply
  // stops being true once there is no item.
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const embed = item ? playlistEmbed(item.provider, item.externalId) : null;
  const mounted = item !== null && readyFor === item.id;

  // The iframe is created only once the overlay is genuinely open. Mounting it
  // with the page would hand every visitor's IP and cookies to Spotify or Google
  // before they asked for anything, and load a third-party player per playlist
  // on a page most people only scroll.
  useEffect(() => {
    if (!item) return;
    // One frame later, so the slide-up transition starts before the iframe
    // begins fetching and competing for the main thread.
    const id = requestAnimationFrame(() => setReadyFor(item.id));
    return () => cancelAnimationFrame(id);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  const open = Boolean(item);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-label={item ? `${item.title} player` : undefined}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(120% 70% at 50% 4%, oklch(0.22 0.02 70) 0%, oklch(0.14 0.015 65) 34%, oklch(0.08 0.01 60) 70%, #050403 100%)",
        transform: open ? "translateY(0%)" : "translateY(100%)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition:
          "transform 0.55s cubic-bezier(0.22, 0.72, 0.16, 1), opacity 0.4s",
      }}
    >
      {/* top bar */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 18px 8px",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 15px 9px 12px",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            borderRadius: 100,
            background: "oklch(0.2 0.015 68 / 0.7)",
            backdropFilter: "blur(8px)",
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 700,
            fontSize: 12.5,
            color: "oklch(0.9 0.03 85)",
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>&lsaquo;</span> Back
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 11.5,
            fontWeight: 600,
            color: "oklch(0.72 0.03 82)",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}`,
            }}
          />
          {item?.providerLabel}
        </div>
      </div>

      {/* TURNTABLE */}
      <div
        style={{
          position: "relative",
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "4px 0 0",
        }}
      >
        <div style={{ perspective: 1100, perspectiveOrigin: "50% 34%" }}>
          <div
            style={{
              position: "relative",
              width: 300,
              height: 232,
              transform: "rotateX(20deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* deck */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "52%",
                width: 288,
                height: 288,
                marginLeft: -144,
                marginTop: -144,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 42% 34%, oklch(0.34 0.008 250), oklch(0.19 0.006 250) 70%)",
                boxShadow:
                  "0 30px 60px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255,255,255,0.08), inset 0 -8px 20px rgba(0,0,0,0.5)",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "52%",
                width: 276,
                height: 276,
                marginLeft: -138,
                marginTop: -138,
                borderRadius: "50%",
                background:
                  "conic-gradient(from 0deg, oklch(0.3 0.006 250), oklch(0.24 0.006 250), oklch(0.3 0.006 250), oklch(0.23 0.006 250), oklch(0.3 0.006 250))",
                opacity: 0.6,
              }}
            />

            {/* vinyl. CSS rotation rather than GSAP: an infinite linear spin is
                one keyframe, and a 70 KB animation library on a public page is
                not worth it. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "52%",
                width: 262,
                height: 262,
                marginLeft: -131,
                marginTop: -131,
                borderRadius: "50%",
                background:
                  "repeating-radial-gradient(circle at 50% 50%, #0c0c0e 0 1.6px, #17171b 1.6px 3.2px)",
                boxShadow:
                  "0 8px 22px rgba(0,0,0,0.55), inset 0 0 40px rgba(0,0,0,0.6)",
                animation: "shelfSpin 2.4s linear infinite",
                animationPlayState: mounted ? "running" : "paused",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.14) 24deg, transparent 60deg, transparent 200deg, rgba(255,255,255,0.08) 224deg, transparent 260deg)",
                }}
              />
              {/* centre label: the real cover if there is one, else the design's
                  gradient-and-initial treatment */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 110,
                  height: 110,
                  marginLeft: -55,
                  marginTop: -55,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: gradient,
                  boxShadow:
                    "inset 0 0 0 1px rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.4)",
                }}
              >
                {item?.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverImageUrl}
                    alt=""
                    width={110}
                    height={110}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "radial-gradient(80% 60% at 30% 24%, rgba(255,255,255,0.4), transparent 58%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-instrument-serif), serif",
                        fontSize: 42,
                        color: "rgba(255,255,255,0.92)",
                      }}
                    >
                      {item?.title.charAt(0).toUpperCase()}
                    </div>
                  </>
                )}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 9,
                  height: 9,
                  marginLeft: -4.5,
                  marginTop: -4.5,
                  borderRadius: "50%",
                  background: "#050505",
                  boxShadow: "0 0 0 2px rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* tonearm, swinging onto the record once it is spinning */}
            <div
              aria-hidden="true"
              style={{ position: "absolute", right: 14, top: 6, width: 44, height: 44 }}
            >
              <div
                style={{
                  position: "absolute",
                  right: 6,
                  top: 6,
                  transformOrigin: "88% 14%",
                  transform: `rotate(${mounted ? 26 : 2}deg)`,
                  transition: "transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: -2,
                    top: -8,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle at 38% 32%, oklch(0.5 0.008 250), oklch(0.26 0.006 250))",
                    boxShadow:
                      "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 14,
                    width: 6,
                    height: 150,
                    borderRadius: 4,
                    transform: "rotate(24deg)",
                    transformOrigin: "top center",
                    background:
                      "linear-gradient(to bottom, oklch(0.62 0.006 250), oklch(0.42 0.006 250))",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -4,
                      bottom: -8,
                      width: 14,
                      height: 20,
                      borderRadius: 3,
                      background:
                        "linear-gradient(to bottom, oklch(0.5 0.006 250), oklch(0.3 0.006 250))",
                      boxShadow: "0 2px 5px rgba(0,0,0,0.5)",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 2, padding: "0 20px" }}>
          {item?.trackCount !== null && item?.trackCount !== undefined && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "1px",
                color: "oklch(0.66 0.04 82)",
                marginBottom: 2,
              }}
            >
              {item.trackCount} TRACKS
            </div>
          )}
          <div
            style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontSize: 30,
              lineHeight: 1.05,
              color: "oklch(0.96 0.01 85)",
            }}
          >
            {item?.title}
          </div>
        </div>
      </div>

      {/* THE PLAYER ITSELF */}
      <div
        style={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "14px 14px 18px",
          minHeight: 0,
        }}
      >
        {embed ? (
          <>
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
                background: "oklch(0.16 0.01 66)",
              }}
            >
              {mounted && item && (
                <iframe
                  key={item.id}
                  src={embed.src}
                  title={`${item.title} player`}
                  width="100%"
                  height={embed.height}
                  style={{ display: "block", border: 0 }}
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                />
              )}
            </div>
            <p
              style={{
                margin: "10px 4px 0",
                fontSize: 11,
                textAlign: "center",
                color: "oklch(0.56 0.02 80)",
              }}
            >
              {embed.note}
            </p>
          </>
        ) : (
          // Amazon Music and pasted links have no player anywhere, so the only
          // honest thing left is the way out to the service that does.
          <div style={{ textAlign: "center", paddingBottom: 8 }}>
            <p
              style={{
                fontSize: 12.5,
                color: "oklch(0.62 0.02 80)",
                marginBottom: 14,
              }}
            >
              {item?.providerLabel} doesn&apos;t offer an embedded player.
            </p>
            {item && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 22px",
                  borderRadius: 100,
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#151210",
                  background:
                    "linear-gradient(180deg, oklch(0.92 0.07 86), oklch(0.82 0.09 80))",
                  boxShadow: "0 10px 26px oklch(0.75 0.09 78 / 0.35)",
                }}
              >
                Open in {item.providerLabel}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
