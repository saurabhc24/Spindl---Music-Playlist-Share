import "dotenv/config";

// Verifies the abuse-prevention primitives: fixed-window rate limiting (memory
// backend) and the request body size cap.
//   npx tsx --conditions=react-server tests/hardening.check.mts
//
// Forces the in-memory backend so the test never depends on Upstash.
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const { rateLimit, rateLimitAll, rateLimitBackend } = await import(
  "../lib/rate-limit"
);
const { readJsonBody, PayloadTooLargeError, clientIp } = await import(
  "../lib/http"
);

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

async function expectThrow(fn: () => Promise<unknown>, what: string) {
  try {
    await fn();
    return { threw: false, error: null as unknown };
  } catch (error) {
    return { threw: true, error };
  } finally {
    void what;
  }
}

function jsonRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

// --- rate limiting -----------------------------------------------------------

check("uses the memory backend when Upstash is unset", rateLimitBackend() === "memory");

const rule = { limit: 3, windowSeconds: 60 };
const key = `test:${Date.now()}:a`;

const first = await rateLimit(key, rule);
check("first request is allowed", first.ok && first.remaining === 2, JSON.stringify(first));

await rateLimit(key, rule);
const third = await rateLimit(key, rule);
check("request at the limit is still allowed", third.ok && third.remaining === 0, JSON.stringify(third));

const fourth = await rateLimit(key, rule);
check("request over the limit is rejected", !fourth.ok, JSON.stringify(fourth));
check("rejection reports a positive Retry-After", fourth.retryAfter > 0, `retryAfter=${fourth.retryAfter}`);

const otherKey = await rateLimit(`test:${Date.now()}:b`, rule);
check("limits are isolated per key", otherKey.ok && otherKey.remaining === 2);

// Window expiry
const shortKey = `test:${Date.now()}:short`;
const shortRule = { limit: 1, windowSeconds: 1 };
await rateLimit(shortKey, shortRule);
const blocked = await rateLimit(shortKey, shortRule);
check("second request inside a 1s window is blocked", !blocked.ok);
await new Promise((resolve) => setTimeout(resolve, 1100));
const afterWindow = await rateLimit(shortKey, shortRule);
check("request is allowed again after the window expires", afterWindow.ok);

// rateLimitAll: the per-account AND per-IP combination
const accountKey = `test:${Date.now()}:acct`;
const ipKey = `test:${Date.now()}:ip`;
const generous = { limit: 100, windowSeconds: 60 };
const strict = { limit: 1, windowSeconds: 60 };

await rateLimitAll([
  { key: accountKey, rule: generous },
  { key: ipKey, rule: strict },
]);
const combined = await rateLimitAll([
  { key: accountKey, rule: generous },
  { key: ipKey, rule: strict },
]);
check(
  "rateLimitAll fails when ANY rule is breached (IP limit catches account-hopping)",
  !combined.ok,
  JSON.stringify(combined)
);

// --- body size limits --------------------------------------------------------

const small = await readJsonBody<{ hello: string }>(
  jsonRequest(JSON.stringify({ hello: "world" })),
  1024
);
check("parses a normal JSON body", small.hello === "world");

const oversized = JSON.stringify({ data: "x".repeat(5000) });
const overResult = await expectThrow(
  () => readJsonBody(jsonRequest(oversized), 1024),
  "oversized"
);
check(
  "rejects a body over the cap",
  overResult.threw && overResult.error instanceof PayloadTooLargeError
);

// A lying Content-Length must not get past the byte counter.
const lyingResult = await expectThrow(
  () => readJsonBody(jsonRequest(oversized, { "content-length": "10" }), 1024),
  "lying content-length"
);
check(
  "rejects an oversized body that under-reports Content-Length",
  lyingResult.threw && lyingResult.error instanceof PayloadTooLargeError
);

const declaredResult = await expectThrow(
  () => readJsonBody(jsonRequest("{}", { "content-length": "999999" }), 1024),
  "declared too large"
);
check(
  "rejects early on an oversized Content-Length header",
  declaredResult.threw && declaredResult.error instanceof PayloadTooLargeError
);

const emptyBody = await readJsonBody(jsonRequest(""), 1024);
check("treats an empty body as an empty object", JSON.stringify(emptyBody) === "{}");

// --- client IP ---------------------------------------------------------------

check(
  "takes the left-most x-forwarded-for entry",
  clientIp(
    new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" },
    })
  ) === "203.0.113.5"
);

check(
  "falls back to x-real-ip",
  clientIp(
    new Request("https://example.com", { headers: { "x-real-ip": "198.51.100.7" } })
  ) === "198.51.100.7"
);

check(
  "reports 'unknown' when no IP header is present",
  clientIp(new Request("https://example.com")) === "unknown"
);

// --- app URL normalization --------------------------------------------------

const { appBaseUrl, absoluteUrl, displayUrl } = await import("../lib/app-url");

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;
for (const variant of [
  "https://spindlshare.vercel.app",
  "https://spindlshare.vercel.app/",
  "https://spindlshare.vercel.app///",
]) {
  process.env.NEXT_PUBLIC_APP_URL = variant;
  check(
    `no double slash for base "${variant.slice(-4)}"`,
    absoluteUrl("/saurabh") ===
      "https://spindlshare.vercel.app/saurabh",
    absoluteUrl("/saurabh")
  );
}

process.env.NEXT_PUBLIC_APP_URL = "https://spindlshare.vercel.app/";
check(
  "displayUrl strips the scheme",
  displayUrl("/saurabh") === "spindlshare.vercel.app/saurabh",
  displayUrl("/saurabh")
);
check(
  "appBaseUrl drops the trailing slash",
  appBaseUrl() === "https://spindlshare.vercel.app",
  appBaseUrl()
);
process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;

// --- provider failure explanations -------------------------------------------

const { syncFailureHint } = await import("../lib/sync-status");

// The exact strings observed in production, kept verbatim so a reworded case
// can't quietly stop matching the failure it was written for.
const PREMIUM =
  "error: Spotify playlist fetch failed: Active premium subscription required for the owner of the app. When the subscription status changes, it can take a few hours before requests are allowed again.";
const NOT_ALLOWLISTED =
  "error: Spotify playlist fetch failed: Check settings on https://developer.spotify.com/dashboard, the user may not be registered.";

check(
  "the app-owner Premium requirement is explained as unfixable by the user",
  /Premium/.test(syncFailureHint(PREMIUM)) &&
    /nothing you can fix/i.test(syncFailureHint(PREMIUM)),
  syncFailureHint(PREMIUM)
);

check(
  "a non-allowlisted account is explained as the 5-user development cap",
  /allowlist/i.test(syncFailureHint(NOT_ALLOWLISTED)) &&
    /5 accounts/.test(syncFailureHint(NOT_ALLOWLISTED)),
  syncFailureHint(NOT_ALLOWLISTED)
);

check(
  "the two Spotify failures get different explanations",
  syncFailureHint(PREMIUM) !== syncFailureHint(NOT_ALLOWLISTED)
);

check(
  "neither Spotify case tells the user to reconnect, which cannot help",
  !/reconnect/i.test(syncFailureHint(PREMIUM)) &&
    !/reconnect/i.test(syncFailureHint(NOT_ALLOWLISTED))
);

check(
  "a quota failure says to wait",
  /later/i.test(
    syncFailureHint("error: YouTube's daily quota is exhausted. Please try again later.")
  )
);

check(
  "a revoked grant says to reconnect",
  /reconnect/i.test(
    syncFailureHint("error: The connection was revoked or expired. Please reconnect the account.")
  )
);

// The case that produced this whole change: an unmatched error used to give
// advice ("try again, or reconnect") that was simply wrong.
const unknown = syncFailureHint("error: Spotify playlist fetch failed: teapot");
check(
  "an unrecognized failure quotes the provider instead of guessing",
  unknown.includes("teapot") && !/^Last sync failed/.test(unknown),
  unknown
);
check(
  "the raw 'error:' prefix is not shown to the user",
  !unknown.includes("error:"),
  unknown
);

console.log(
  failures === 0 ? "\nAll hardening checks passed." : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
