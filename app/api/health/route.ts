import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { rateLimitBackend } from "@/lib/rate-limit";

/**
 * Deployment diagnostics.
 *
 * Public response is deliberately minimal -- just whether the database answers --
 * because error text from a failed connection can contain the host and user from
 * the connection string.
 *
 * Sending `Authorization: Bearer $CRON_SECRET` returns the detail needed to debug
 * a broken deploy: which variables are set (names and booleans only, never
 * values) and the actual database error.
 */
export const dynamic = "force-dynamic";

const REQUIRED_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "TOKEN_ENCRYPTION_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

const OPTIONAL_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SPOTIFY_CLIENT_ID",
  "SPOTIFY_CLIENT_SECRET",
  "SPOTIFY_REDIRECT_URI",
  "YOUTUBE_REDIRECT_URI",
  "AUTH_RESEND_KEY",
  "CRON_SECRET",
  // Without this, /admin 404s for everyone -- and since the gate deliberately
  // 404s rather than 403s, a missing variable is indistinguishable from correct
  // refusal when probing from outside. Reported here so it stays diagnosable.
  "ADMIN_EMAILS",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
] as const;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const detailed = Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`
  );

  let dbUp = false;
  let dbError: string | null = null;
  let dbLatencyMs: number | null = null;

  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbUp = true;
    dbLatencyMs = Date.now() - started;
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
  }

  if (!detailed) {
    return NextResponse.json(
      { ok: dbUp, db: dbUp ? "up" : "down" },
      { status: dbUp ? 200 : 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const present = (name: string) => Boolean(process.env[name]?.trim());

  return NextResponse.json(
    {
      ok: dbUp,
      db: {
        up: dbUp,
        latencyMs: dbLatencyMs,
        error: dbError,
        // Host only -- never the credentials.
        host: safeHost(process.env.DATABASE_URL),
        directHost: safeHost(process.env.DIRECT_URL),
        pooled: process.env.DATABASE_URL?.includes("-pooler") ?? false,
      },
      env: {
        missingRequired: REQUIRED_VARS.filter((name) => !present(name)),
        setOptional: OPTIONAL_VARS.filter((name) => present(name)),
      },
      runtime: {
        nodeEnv: process.env.NODE_ENV,
        vercelRegion: process.env.VERCEL_REGION ?? null,
        rateLimitBackend: rateLimitBackend(),
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      },
    },
    { status: dbUp ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

function safeHost(connectionString: string | undefined): string | null {
  if (!connectionString) return null;
  try {
    return new URL(connectionString).host;
  } catch {
    return "unparseable";
  }
}
