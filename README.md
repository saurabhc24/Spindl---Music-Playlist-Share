# Spindl

**Everything you've got spinning.** A shareable shelf for your music playlists —
connect Spotify and YouTube, pick what you want to show, and share it all from
one link (`spindl.app/yourname`).

Built with Next.js 16 (App Router) + TypeScript, Prisma 7 + Postgres, and
Auth.js v5. Deploys to Vercel.

---

## Getting started

```bash
npm install                  # also runs `prisma generate` via postinstall
cp .env.example .env         # then fill in the values (see below)
npx prisma dev --detach      # local Postgres, or point DATABASE_URL at Neon
npm run db:migrate           # apply the schema
npm run db:seed              # optional: demo profile at /demo
npm run dev                  # http://127.0.0.1:3000
```

> Use `127.0.0.1`, not `localhost` — Spotify rejects `localhost` redirect URIs
> for the **connect** flow, whose URL we build ourselves.
>
> Spotify **login** is the exception, and it cannot be made to work locally.
> Auth.js derives its callback from the request, and `next dev` reports its
> origin as `http://localhost:PORT` whatever address you browse to — the `Host`
> and `X-Forwarded-Host` headers are ignored, `-H 127.0.0.1` doesn't change it,
> and `AUTH_URL` doesn't override it. Spotify's rules say "localhost is not
> allowed as redirect URI", so there is no value that can be registered to match
> what gets sent. Sign in with Google or the email link locally; Spotify login
> works on a deployed URL, where the origin is real.

### Minimum env to boot

`AUTH_SECRET` (`npx auth secret`), `TOKEN_ENCRYPTION_KEY`
(`openssl rand -base64 32`), and `DATABASE_URL` / `DIRECT_URL`. Provider
credentials are only needed for the features that use them — the login page
offers only the sign-in methods that are configured, and the Connections page
shows a "not configured" state until they're set. See `.env.example` for where to
obtain each value.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (typechecks) |
| `npm run lint` | ESLint |
| `npm run check` | All logic checks (see below) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed a demo profile |
| `npm run db:studio` | Prisma Studio |

`npm run check` runs seven suites: `crypto`, `sync`, `youtube`, `hardening`,
`username`, `rename` and `admin`. Each is also runnable on its own
(`npm run check:sync`). They're plain `tsx` scripts with a `check()` helper rather
than a test framework — enough to assert the invariants that matter without
another dependency in the tree.

`crypto`, `youtube` and `hardening` run anywhere. `sync`, `username`, `rename`
and `admin` need a live database; they create rows under a timestamped prefix and
clean up after themselves.

## How it's put together

```
app/[username]/       public profile page + OG image
app/(auth)/           login, magic-link verify, username onboarding
app/dashboard/        connections, playlist curation, settings
app/admin/            moderation and site overview
app/api/connect/      OAuth start + callback (per provider)
app/api/sync/         pull playlists from a connected provider
app/api/health/       deployment diagnostics
lib/providers/        one module per music service
lib/sync.ts           reconciles fetched playlists into the DB
lib/crypto.ts         AES-256-GCM for stored OAuth tokens
lib/rate-limit.ts     per-account + per-IP fixed windows
lib/dal.ts            the authoritative session and profile checks
proxy.ts              optimistic auth gate (Next 16's renamed middleware)
```

### Notable decisions

- **App login and music connections are separate OAuth systems.** Auth.js
  handles sign-in only; Spotify/YouTube connections are hand-rolled and stored
  in `ConnectedAccount` with encrypted tokens. This keeps login scopes minimal
  and lets a music account be revoked without affecting sign-in.
- **Google's OAuth client is reused for both** login and YouTube-connect, with
  different redirect URIs and scopes — one client to manage instead of two.
- **Sync never destroys curation.** `visible` and `sortOrder` are set only when a
  playlist is first seen. Playlists that vanish upstream are flagged stale, not
  deleted, so a curated order never silently changes.
- **New imports default to hidden**, so connecting an account doesn't dump a
  hundred playlists onto your public page.
- **Tokens are encrypted at rest** (AES-256-GCM) rather than stored in plaintext.
- **`@prisma/adapter-pg` over the Neon serverless driver**, so the same code path
  works against local Postgres and Neon.
- **`proxy.ts` only checks for a cookie.** It runs on every dashboard request, so
  it stays a cheap optimistic gate; the authoritative check lives in `lib/dal.ts`,
  next to the data it protects.

### Usernames

Profiles store the name twice: `username` as typed (display only) and
`usernameNormalized` (NFKC + lowercase) which carries the unique index and is the
only lookup path. NFKC matters for more than tidiness — without it, fullwidth
`ｄｅｍｏ` would register as a distinct row from `demo` and read identically on
screen. Postgres `citext` would also work, but Prisma can only model it as
`Unsupported()`, which is unusable in typed `where` clauses.

Claiming a name does **no** availability pre-check before inserting. Any
SELECT-then-INSERT is a TOCTOU race, so the unique index arbitrates and the
`P2002` violation is translated into a friendly "just taken" message. The
`/api/username/available` endpoint exists purely for form feedback, is debounced
client-side, rate-limited per IP, and caches only *negative* results (a name
going from taken to free is rare; the reverse is not).

Renaming from Settings records the released name in `UsernameHistory`, so old
links 301 to the current profile instead of 404ing. History is consulted only
after the primary lookup misses, keeping the common path a single indexed query.
Claiming a name that someone else previously released deletes that stale history
row in the same transaction — otherwise an old link would resolve to the wrong
profile. Casing variants of a live URL permanently redirect to the canonical
lowercase form, which also stops `/demo`, `/Demo` and `/DEMO` from each occupying
a separate ISR cache entry.

### Moderation and admin

`/admin` lists every profile with its playlist and connection counts, plus
site-wide totals, and can suspend, restore or delete an account.

Who counts as an admin comes from the `ADMIN_EMAILS` environment variable
(comma-separated, matched case-insensitively against the whole address), not a
column on `User`. Admin status therefore sits outside the data the application
writes: anyone who finds a way to write to the database still can't promote
themselves, and there is no "grant admin" code path to get wrong. The cost is a
redeploy to change the list, which is the right trade for a list that should
change roughly never.

The gate responds **404, not 403**, so a signed-in non-admin sees exactly what a
logged-out stranger sees and the area isn't discoverable by probing.

Suspension writes `suspendedAt`, deliberately a separate column from the user's
own `isPublic` toggle — otherwise a suspended user could simply un-hide
themselves from Settings. A suspended page returns an ordinary 404 rather than
announcing that it was suspended, and the reason is shown only in the admin list.
Admins can't suspend or delete their own account (a misclick would hide the page
they need in order to undo it), and deletion requires typing the username, since
it cascades to playlists, connections and sessions.

### Handling traffic and abuse

The public profile page is the highest-traffic route, so it's ISR-cached and
served from the edge — repeat views never reach the database. This requires
`generateStaticParams` on the dynamic segment: **without it Next serves
`Cache-Control: no-store` and every view hits the DB.** Verify with
`x-nextjs-cache: HIT` on a repeat request. The OG image is cached the same way,
on a longer window, since crawlers hit it in bursts and each render is expensive.

Mutating endpoints are rate-limited **per account and per IP together**
(`lib/rate-limit.ts`) — an account limit alone is bypassed by making more
accounts, so username claiming is IP-limited as the choke point on account
farming. Limits use Upstash Redis when configured and fall back to an in-process
counter otherwise; **the fallback is per-instance, so production must set
`UPSTASH_REDIS_REST_URL`/`TOKEN`** for limits to actually hold across serverless
instances. `/api/health` reports which backend is live.

Every JSON endpoint caps its request body (`readJsonBody`), counting real bytes
rather than trusting `Content-Length`. Provider 429s and YouTube quota errors are
surfaced as `503` with `Retry-After` rather than retried, because those quotas
are per-application: hammering them degrades sync for every user.

A daily Vercel Cron (`vercel.json` → `/api/cron/cleanup`, guarded by
`CRON_SECRET`) clears expired sessions and verification tokens, which Auth.js
writes but never reaps, plus signups older than 30 days that never claimed a
username. It deliberately does **not** delete established accounts for
inactivity — that destroys real data and breaks live shared links, so it should
be a product decision with warning emails, not a silent cron job. Pass
`?dryRun=1` to see what it would remove.

### On "YouTube" vs "YouTube Music"

There is no official YouTube Music API. Spindl reads your playlists through the
YouTube Data API v3, which is where YouTube Music playlists live underneath — so
the UI says "YouTube playlists" rather than claiming YouTube Music support.

Note that `youtube.readonly` is a *sensitive* scope: until Google verifies the
app, the consent screen shows an "unverified app" warning and is capped at 100
test users.

## Deploying

Push to `main`, import the repo on Vercel, then set every variable from
`.env.example` in the project settings. Point `DATABASE_URL` at Neon's **pooled**
connection string and `DIRECT_URL` at the unpooled one. Set `ADMIN_EMAILS` if you
want the moderation area, and `CRON_SECRET` for the daily cleanup job.

Then register the production callback URLs. There are two per provider and only
the connect ones are environment variables, which is exactly why the login ones
get missed — a missing entry surfaces as the provider's own
`redirect_uri: not matching configuration` after the user has already typed
their password:

| Console | Redirect URI |
| --- | --- |
| Google | `https://your-app/api/auth/callback/google` (login) |
| Google | `https://your-app/api/connect/youtube/callback` (connect) |
| Spotify | `https://your-app/api/auth/callback/spotify` (login) |
| Spotify | `https://your-app/api/connect/spotify/callback` (connect) |

The live values are worth reading rather than assuming — `/api/auth/providers`
is public and reports exactly what Auth.js will send:

```bash
curl -s https://your-app/api/auth/providers
```

### Checking a deploy

`/api/health` answers `{ ok, db }` publicly — deliberately minimal, because error
text from a failed connection can leak the database host and user. Send the cron
secret to get the detail that actually debugs a broken deploy:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/health
```

That returns which required variables are missing (names and booleans only, never
values), whether `DATABASE_URL` is the pooled endpoint, database latency, the
region, and which rate-limit backend is live.

## Not built yet

- **Avatar upload.** Avatars are taken from the login provider;
  `BLOB_READ_WRITE_TOKEN` is reserved for uploading your own.
- **Themes.** `Profile.theme` exists in the schema with no UI behind it.
- **Self-serve account deletion.** Only an admin can delete an account today.
