import "server-only";

import { NextResponse } from "next/server";

import type { RateLimitResult } from "@/lib/rate-limit";

/**
 * Best-effort client IP.
 *
 * Behind Vercel, `x-forwarded-for` is set by the platform and its left-most entry
 * is the real client. Note this header is spoofable when the app is served
 * without a trusted proxy in front, so IP limits are a speed bump against casual
 * abuse, not a security boundary -- the per-account limits are the real control.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

/** Default cap for JSON endpoints. Every payload we accept is far below this. */
export const MAX_JSON_BYTES = 16 * 1024;

export class PayloadTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Reads a JSON body while enforcing a hard byte cap.
 *
 * Checks Content-Length first as a cheap reject, then streams and counts actual
 * bytes -- a client can lie about or omit Content-Length, so the header alone is
 * not enough to stop someone streaming an unbounded body at us.
 */
export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes: number = MAX_JSON_BYTES
): Promise<T> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  const body = request.body;
  if (!body) return {} as T;

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(merged);
  if (!text.trim()) return {} as T;

  return JSON.parse(text) as T;
}

export function tooLargeResponse(maxBytes: number) {
  return NextResponse.json(
    { error: `Request body too large (max ${maxBytes} bytes).` },
    { status: 413 }
  );
}

export function rateLimitedResponse(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}
