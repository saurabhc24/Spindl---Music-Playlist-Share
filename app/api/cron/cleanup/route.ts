import { NextResponse } from "next/server";

import { runCleanup } from "@/lib/cleanup";

// Vercel Cron invokes this on the schedule in vercel.json. It must never be
// callable by the public, or anyone could trigger deletes at will.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[cron:cleanup] CRON_SECRET is not set; refusing to run.");
    return NextResponse.json(
      { error: "Cron is not configured." },
      { status: 503 }
    );
  }

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?dryRun=1 reports what would be removed without touching anything.
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const result = await runCleanup({ dryRun });
    console.log("[cron:cleanup]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron:cleanup] failed", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
