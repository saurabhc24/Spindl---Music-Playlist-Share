/**
 * Turns a stored `lastSyncStatus` into something the user can act on.
 *
 * Deliberately free of server-only imports so the same mapping is usable from a
 * server component, a route handler, and the checks -- there is exactly one
 * place a provider failure gets explained.
 *
 * The strings matched here are the providers' own wording, captured from real
 * failures rather than guessed at. Each case answers only the question that
 * changes what the user does next: wait, reconnect, or nothing-you-can-fix.
 */

/**
 * Matched against the raw stored status, which looks like
 * `error: Spotify playlist fetch failed: <the provider's own message>`.
 */
const CASES: Array<{ pattern: RegExp; hint: string }> = [
  {
    // Spotify gates all Web API access on the *app owner* holding Premium --
    // not the connecting user, so there is nothing this user can do about it.
    pattern: /premium/i,
    hint: "Spotify only returns playlists when the account that owns the API app has Spotify Premium. Nothing you can fix from here — the connection itself is fine.",
  },
  {
    // Spotify apps in development mode serve 5 accounts, each added by hand in
    // the developer dashboard. Everyone else authorizes fine and then gets 403.
    pattern: /may not be registered|not registered|user.{0,20}dashboard/i,
    hint: "This Spotify account isn't on the app's allowlist. Spotify apps in development mode work for only 5 accounts, each added by hand in the Spotify developer dashboard under Settings → User Management.",
  },
  {
    pattern: /quota|rate.?limit/i,
    hint: "The service is rate-limiting us or is out of its daily quota. This usually clears on its own — try again later.",
  },
  {
    pattern: /revoked|expired|reconnect/i,
    hint: "The connection expired or was revoked. Reconnect the account to fix it.",
  },
];

export function syncFailureHint(status: string): string {
  for (const { pattern, hint } of CASES) {
    if (pattern.test(status)) return hint;
  }

  // No match. Repeating "try again, or reconnect" here would be a guess, and
  // guessing is what sent someone off to reconnect an account whose problem
  // reconnecting could never fix. Show what the provider actually said instead:
  // it is the user's own connection, and it is the only thing that makes an
  // unrecognized failure diagnosable without a database query.
  const detail = status.replace(/^error:\s*/i, "").trim();
  return detail
    ? `The import failed and we don't have specific advice for this one. The service said: ${detail}`
    : "The import failed for an unknown reason. Try syncing again, or reconnect the account.";
}
