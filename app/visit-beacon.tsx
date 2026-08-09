"use client";

import { useEffect } from "react";

/**
 * Reports one visit per browser session.
 *
 * The guard is what makes this a *visit* rather than a page view: sessionStorage
 * is per tab and cleared when it closes, so browsing five pages counts once and
 * coming back tomorrow counts again. That is the number people mean by "visits",
 * and it is the one the admin page claims to show.
 *
 * Renders nothing and is mounted in the root layout, so it covers every route
 * rather than only the public ones.
 */
const SEEN_KEY = "spindl:visit-counted";

export function VisitBeacon() {
  useEffect(() => {
    // Private-mode and storage-partitioned browsers can throw on access rather
    // than merely returning null, and a vanity counter is not worth breaking a
    // page over. Failing closed here just means the visit goes uncounted.
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      return;
    }

    // keepalive so the request still lands if this was the last thing the
    // visitor did before navigating away.
    void fetch("/api/visit", { method: "POST", keepalive: true }).catch(() => {
      // Nothing to do and nobody to tell. The count is advisory.
    });
  }, []);

  return null;
}
