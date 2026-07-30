import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import type { MusicProvider } from "@/app/generated/prisma/enums";
import { safeEqual } from "@/lib/crypto";

// CSRF protection for the connect flows: we mint a random `state`, stash it in a
// short-lived httpOnly cookie, and require the callback to echo it back.
const COOKIE_PREFIX = "connect_state_";
const MAX_AGE_SECONDS = 10 * 60;

function cookieName(provider: MusicProvider) {
  return `${COOKIE_PREFIX}${provider.toLowerCase()}`;
}

export async function createOAuthState(provider: MusicProvider) {
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();

  cookieStore.set(cookieName(provider), state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return state;
}

export async function verifyOAuthState(
  provider: MusicProvider,
  received: string | null
): Promise<boolean> {
  const cookieStore = await cookies();
  const name = cookieName(provider);
  const expected = cookieStore.get(name)?.value;

  // Single-use: clear it whether or not it matched.
  cookieStore.delete(name);

  if (!expected || !received) return false;
  return safeEqual(expected, received);
}
