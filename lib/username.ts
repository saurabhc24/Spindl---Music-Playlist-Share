/**
 * Username rules, normalization and reserved-word checks.
 *
 * Deliberately free of server-only imports so the same rules run in the browser
 * for instant feedback and on the server as the source of truth. The client is
 * never trusted: every mutation re-validates here before touching the database.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/**
 * Normalizes to the uniqueness key.
 *
 * NFKC first, so compatibility forms collapse to their plain equivalents --
 * fullwidth "ｈｅｌｌｏ" and the ligature "ﬁx" become "hello" and "fix". Without it
 * those would slip past an ASCII check as distinct strings and let someone
 * register a visual twin of an existing profile.
 *
 * Then lowercase, using the locale-independent toLowerCase (not
 * toLocaleLowerCase, which would map Turkish dotted I differently depending on
 * where the server runs and could make the same input normalize two ways).
 */
export function normalizeUsername(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase();
}

/**
 * Anchored so the whole string must match: starts and ends alphanumeric, with
 * single `.` or `_` separators only between alphanumerics. That one pattern
 * covers "no leading/trailing separator" and "no consecutive separators"
 * together, rather than three checks that can disagree.
 */
const USERNAME_PATTERN = /^[a-z0-9]+(?:[._][a-z0-9]+)*$/;

/**
 * Names that must never belong to a user: our own routes (a user at /settings
 * would shadow the real page), brand terms usable for impersonation, and common
 * role accounts.
 */
const RESERVED_USERNAMES = new Set([
  // Routes, current and plausible.
  "api", "app", "dashboard", "admin", "administrator", "login", "logout",
  "signin", "signup", "signout", "register", "onboarding", "settings",
  "account", "accounts", "profile", "profiles", "me", "user", "users",
  "auth", "oauth", "connect", "disconnect", "sync", "callback", "cron",
  "explore", "discover", "search", "new", "edit", "delete", "embed", "widget",
  "about", "help", "support", "contact", "terms", "privacy", "legal",
  "pricing", "plans", "billing", "blog", "docs", "status", "changelog",
  "static", "public", "assets", "images", "img", "media", "files", "cdn",
  "favicon", "robots", "sitemap", "manifest", "_next", "well-known",
  "www", "mail", "email", "smtp", "ftp", "ns", "dns", "test", "dev", "staging",
  // Brand terms, so nobody can pose as the product.
  "spindl", "spindle", "spindlapp", "official", "team", "staff", "moderator",
  "mod", "system", "root", "security", "verified", "shelf",
  // Integration names, which would imply an official account.
  "spotify", "youtube", "applemusic", "apple", "soundcloud", "tidal", "deezer",
  "music", "playlist", "playlists",
  // Values that break naive client code if they ever reach it as a string.
  "null", "undefined", "nan", "true", "false", "none",
  // Basic profanity. Exact-match only: substring matching here would reject
  // innocent names (the Scunthorpe problem -- "class" contains a slur-adjacent
  // substring). Severe slurs are handled separately below.
  "fuck", "shit", "bitch", "bastard", "wanker", "cunt", "dick", "piss",
  "porn", "nude", "nudes", "sex", "xxx", "rape", "rapist",
]);

/**
 * Substring-matched, unlike the list above.
 *
 * Reserved for terms with no innocent English substring collisions, where
 * padding ("xxslurxx") is the obvious evasion. Keep this list short and
 * unambiguous -- anything with a plausible false positive belongs in the
 * exact-match set instead. A production deployment should back this with a
 * maintained wordlist rather than hand-curating it here.
 */
const BLOCKED_SUBSTRINGS = [
  "nigger", "nigga", "faggot", "tranny", "kike", "chink", "spic",
  "childporn", "cp0rn", "pedophile", "pedo",
];

export type UsernameError =
  | "too_short"
  | "too_long"
  | "invalid_characters"
  | "reserved"
  | "profane";

export const USERNAME_ERROR_MESSAGES: Record<UsernameError, string> = {
  too_short: `Usernames must be at least ${USERNAME_MIN_LENGTH} characters.`,
  too_long: `Usernames must be at most ${USERNAME_MAX_LENGTH} characters.`,
  invalid_characters:
    "Use letters, numbers, periods and underscores. Periods and underscores can't start, end, or repeat.",
  reserved: "That username is reserved. Please choose another.",
  profane: "That username isn't available. Please choose another.",
};

export type UsernameValidation =
  | { ok: true; username: string; normalized: string }
  | { ok: false; error: UsernameError; message: string };

/**
 * Validates raw input and returns both the display form and the uniqueness key.
 *
 * Length is measured on the normalized value, since NFKC can change it -- one
 * fullwidth character becomes one ASCII character, but a ligature can expand.
 */
export function validateUsername(input: unknown): UsernameValidation {
  const raw = typeof input === "string" ? input.trim() : "";
  const normalized = normalizeUsername(raw);

  const fail = (error: UsernameError): UsernameValidation => ({
    ok: false,
    error,
    message: USERNAME_ERROR_MESSAGES[error],
  });

  if (normalized.length < USERNAME_MIN_LENGTH) return fail("too_short");
  if (normalized.length > USERNAME_MAX_LENGTH) return fail("too_long");
  if (!USERNAME_PATTERN.test(normalized)) return fail("invalid_characters");
  if (RESERVED_USERNAMES.has(normalized)) return fail("reserved");

  // Check with separators stripped too, so "f.u.c.k" can't walk past the
  // exact-match list.
  const stripped = normalized.replace(/[._]/g, "");
  if (RESERVED_USERNAMES.has(stripped)) return fail("reserved");
  if (BLOCKED_SUBSTRINGS.some((term) => stripped.includes(term))) {
    return fail("profane");
  }

  return { ok: true, username: raw.normalize("NFKC"), normalized };
}
