/**
 * The app's public base URL, without a trailing slash.
 *
 * Vercel's dashboard shows the domain with a trailing slash, so that's what gets
 * pasted into NEXT_PUBLIC_APP_URL more often than not. Normalizing here means a
 * stray slash can't produce `https://host//username` in shared links, rather
 * than depending on whoever sets the variable getting it exactly right.
 */
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
}

/** Absolute URL for an app-relative path. */
export function absoluteUrl(path: string): string {
  const base = appBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Host and path only, for display (e.g. "spindl.app/saurabh"). */
export function displayUrl(path = ""): string {
  return absoluteUrl(path).replace(/^https?:\/\//, "");
}
