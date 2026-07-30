import { NextResponse } from "next/server";

import { clientIp, rateLimitedResponse } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, rateLimitAll } from "@/lib/rate-limit";
import { validateUsername } from "@/lib/username";

/**
 * Availability check for the signup form.
 *
 * Advisory only -- the answer can go stale the instant it's sent. The unique
 * index settles who actually gets the name; this exists purely so the form can
 * say "taken" before the user submits.
 */

// Only negative results are cached. "Taken" is durable (a name frees up only via
// a rename or account deletion), whereas caching "available" would keep telling
// people a name is free right after someone claimed it, so they'd hit a failure
// on submit instead of seeing it greyed out.
const TAKEN_CACHE_TTL_MS = 60_000;
const takenCache = new Map<string, number>();

function isKnownTaken(normalized: string): boolean {
  const expiresAt = takenCache.get(normalized);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    takenCache.delete(normalized);
    return false;
  }
  return true;
}

function rememberTaken(normalized: string) {
  // Bounded so a scripted walk through the namespace can't grow this forever.
  if (takenCache.size > 2000) {
    const now = Date.now();
    for (const [key, expiresAt] of takenCache) {
      if (expiresAt <= now) takenCache.delete(key);
    }
    if (takenCache.size > 2000) takenCache.clear();
  }
  takenCache.set(normalized, Date.now() + TAKEN_CACHE_TTL_MS);
}

export async function GET(request: Request) {
  // Per-IP only: this endpoint is reachable during signup before a session
  // exists. Rate limited so it can't be used to enumerate the namespace in bulk.
  const limited = await rateLimitAll([
    {
      key: `username-check:ip:${clientIp(request)}`,
      rule: RATE_LIMITS.usernameCheckPerIp,
    },
  ]);
  if (!limited.ok) return rateLimitedResponse(limited);

  const raw = new URL(request.url).searchParams.get("u") ?? "";

  // Reject invalid input without a query -- it can never be available anyway.
  const validation = validateUsername(raw);
  if (!validation.ok) {
    return NextResponse.json(
      { available: false, reason: validation.error, message: validation.message },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const { normalized } = validation;

  if (isKnownTaken(normalized)) {
    return NextResponse.json(
      { available: false, reason: "taken", message: "That username is taken." },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // Single indexed lookup on the unique column, selecting nothing but the key.
  const existing = await prisma.profile.findUnique({
    where: { usernameNormalized: normalized },
    select: { id: true },
  });

  if (existing) {
    rememberTaken(normalized);
    return NextResponse.json(
      { available: false, reason: "taken", message: "That username is taken." },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { available: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
