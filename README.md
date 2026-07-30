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

> Use `127.0.0.1`, not `localhost` — Spotify rejects `localhost` redirect URIs.

### Minimum env to boot

`AUTH_SECRET` (`npx auth secret`), `TOKEN_ENCRYPTION_KEY`
(`openssl rand -base64 32`), and `DATABASE_URL` / `DIRECT_URL`. Provider
credentials are only needed for the features that use them — the Connections
page shows a "not configured" state until they're set. See `.env.example` for
where to obtain each value.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (typechecks) |
| `npm run lint` | ESLint |
| `npm run check` | Logic checks — crypto, sync engine, YouTube provider, hardening |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Seed a demo profile |
| `npm run db:studio` | Prisma Studio |

`npm run check:sync` needs a running database; the other checks don't.

## How it's put together

```
app/[username]/       public profile page + OG image
app/dashboard/        connections, playlist curation, settings
app/api/connect/      OAuth start + callback (per provider)
app/api/sync/         pull playlists from a connected provider
lib/providers/        one module per music service
lib/sync.ts           reconciles fetched playlists into the DB
lib/crypto.ts         AES-256-GCM for stored OAuth tokens
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
instances.

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
connection string and `DIRECT_URL` at the unpooled one. Add the production
callback URLs to each provider's console alongside the local ones.
