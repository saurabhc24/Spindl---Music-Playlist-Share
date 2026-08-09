import { NextResponse } from "next/server";

import { clientIp } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, rateLimitAll } from "@/lib/rate-limit";

/**
 * The visit counter's write end, called once per browser session by the beacon
 * in the root layout.
 *
 * A beacon rather than a count during render, because the highest-traffic page
 * in the app is ISR-cached: counting at render time would either miss every
 * cached view or force the page dynamic, and that cache is the reason the public
 * profile is cheap to serve. The trade is that this only counts visitors running
 * JavaScript -- which is roughly the same population Vercel Analytics reports,
 * and it excludes most crawlers, which is a feature here.
 *
 * Takes no body at all. There is nothing a caller could tell us that we would
 * believe, so there is nothing to read, validate or cap.
 */
export async function POST(request: Request) {
  // Per-IP only: this is a public endpoint with no session, on every page.
  const limited = await rateLimitAll([
    { key: `visit:ip:${clientIp(request)}`, rule: RATE_LIMITS.visitPerIp },
  ]);
  // Silently accepted rather than 429'd. The caller is a fire-and-forget beacon
  // with nothing to retry and nobody to tell, and a console full of red on a
  // visitor's screen would be a worse bug than an undercounted visit.
  if (!limited.ok) return new NextResponse(null, { status: 204 });

  // One statement, and the day comes from the database rather than the server or
  // the visitor: three clocks that can disagree, only one of which owns the key.
  // ON CONFLICT makes the whole thing atomic, so simultaneous visits increment
  // rather than racing two rows into existence for the same day.
  await prisma.$executeRaw`
    INSERT INTO "DailyVisit" ("day", "views")
    VALUES (current_date, 1)
    ON CONFLICT ("day") DO UPDATE
      SET "views" = "DailyVisit"."views" + 1
  `;

  return new NextResponse(null, { status: 204 });
}
