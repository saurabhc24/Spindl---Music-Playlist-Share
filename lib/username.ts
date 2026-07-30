import { z } from "zod";

// Usernames live at the root of the public URL space (app.com/<username>), so they
// must not collide with any current or plausible future top-level route.
const RESERVED_USERNAMES = new Set([
  "api",
  "dashboard",
  "admin",
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "onboarding",
  "settings",
  "account",
  "profile",
  "app",
  "www",
  "mail",
  "support",
  "help",
  "about",
  "terms",
  "privacy",
  "legal",
  "pricing",
  "blog",
  "docs",
  "status",
  "explore",
  "discover",
  "search",
  "new",
  "edit",
  "static",
  "public",
  "assets",
  "images",
  "img",
  "favicon",
  "robots",
  "sitemap",
  "_next",
  "auth",
  "connect",
  "sync",
  "callback",
  "me",
  "user",
  "users",
  "playlist",
  "playlists",
  "spotify",
  "youtube",
  "apple",
  "music",
  "null",
  "undefined",
  // Brand terms, so nobody can impersonate the product itself.
  "spindl",
  "spindle",
  "shelf",
  "official",
]);

// 3-30 chars, lowercase alphanumeric plus internal hyphens (no leading/trailing).
const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(30, "Username must be at most 30 characters.")
  .regex(
    USERNAME_REGEX,
    "Use lowercase letters, numbers and hyphens only (hyphens can't start or end it)."
  )
  .refine((value) => !RESERVED_USERNAMES.has(value), {
    message: "That username is reserved. Please pick another.",
  });

export function isReservedUsername(username: string) {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}
