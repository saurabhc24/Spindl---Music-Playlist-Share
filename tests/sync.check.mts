import "dotenv/config";

// Exercises the REAL lib/sync.ts + lib/providers/spotify.ts against a stubbed
// Spotify HTTP API, to verify token refresh, upsert, curation preservation and
// stale marking. Needs a running database (DATABASE_URL).
//   npx tsx --conditions=react-server tests/sync.check.mts
//
// Credentials are never used against the network here -- the fetch stub below
// intercepts every Spotify call -- but the provider module requires them to be set.
process.env.SPOTIFY_CLIENT_ID ??= "test-client-id";
process.env.SPOTIFY_CLIENT_SECRET ??= "test-client-secret";
process.env.SPOTIFY_REDIRECT_URI ??=
  "http://127.0.0.1:3000/api/connect/spotify/callback";

type FetchArgs = Parameters<typeof fetch>;

let playlistPayload: unknown = null;
let refreshCalls = 0;

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: FetchArgs[0], init?: FetchArgs[1]) => {
  const url = typeof input === "string" ? input : input.toString();

  if (url.startsWith("https://accounts.spotify.com/api/token")) {
    refreshCalls++;
    return new Response(
      JSON.stringify({
        access_token: "fresh-access-token",
        expires_in: 3600,
        scope: "playlist-read-private",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (url.startsWith("https://api.spotify.com/v1/me/playlists")) {
    return new Response(JSON.stringify(playlistPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return realFetch(input, init);
}) as typeof fetch;

const { PrismaClient } = await import("../app/generated/prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { encrypt } = await import("../lib/crypto");
const { syncProvider } = await import("../lib/sync");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

function spotifyPage(items: unknown[], next: string | null = null) {
  return { items, next };
}

function makeItem(id: string, name: string, total: number) {
  return {
    id,
    name,
    description: `${name} description`,
    images: [{ url: `https://i.scdn.co/${id}.jpg` }],
    external_urls: { spotify: `https://open.spotify.com/playlist/${id}` },
    tracks: { total },
  };
}

async function main() {
  // Fresh isolated user for this test.
  const user = await prisma.user.upsert({
    where: { email: "synctest@example.com" },
    update: {},
    create: { email: "synctest@example.com", name: "Sync Test" },
  });
  await prisma.playlist.deleteMany({ where: { userId: user.id } });
  await prisma.connectedAccount.deleteMany({ where: { userId: user.id } });

  const connection = await prisma.connectedAccount.create({
    data: {
      userId: user.id,
      provider: "SPOTIFY",
      // Deliberately expired, to force the refresh path.
      accessTokenEncrypted: encrypt("stale-access-token"),
      refreshTokenEncrypted: encrypt("a-refresh-token"),
      expiresAt: new Date(Date.now() - 60_000),
    },
  });

  // --- Sync #1: two playlists arrive ---
  playlistPayload = spotifyPage([
    makeItem("p1", "Morning coffee", 20),
    makeItem("p2", "Gym", 55),
  ]);

  const first = await syncProvider({ userId: user.id, connection: { ...connection, provider: "SPOTIFY" } });

  check("refreshes an expired access token", refreshCalls === 1, `(calls=${refreshCalls})`);
  check("imports both playlists", first.imported === 2 && first.added === 2, JSON.stringify(first));

  const stored = await prisma.connectedAccount.findUniqueOrThrow({
    where: { id: connection.id },
  });
  check("persists refreshed token + ok status", stored.lastSyncStatus === "ok" && stored.lastSyncedAt !== null);
  check("keeps the existing refresh token when provider omits it", stored.refreshTokenEncrypted !== null);

  const afterFirst = await prisma.playlist.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
  });
  check("new imports default to hidden", afterFirst.every((p) => !p.visible));
  check("assigns increasing sortOrder", afterFirst[0].sortOrder < afterFirst[1].sortOrder);
  check("maps cover art and track count", afterFirst[0].coverImageUrl?.includes(".jpg") === true && afterFirst[0].trackCount === 20);

  // User curates: show p1, and move it after p2.
  await prisma.playlist.update({
    where: { id: afterFirst[0].id },
    data: { visible: true, sortOrder: 99_000 },
  });

  // --- Sync #2: p1 renamed, p2 gone, p3 new ---
  const refreshed = await prisma.connectedAccount.findUniqueOrThrow({
    where: { id: connection.id },
  });
  playlistPayload = spotifyPage([
    makeItem("p1", "Morning coffee (2026 edit)", 23),
    makeItem("p3", "Late night", 8),
  ]);

  const second = await syncProvider({ userId: user.id, connection: { ...refreshed, provider: "SPOTIFY" } });
  check("second sync reports 1 new + 1 stale", second.added === 1 && second.markedStale === 1, JSON.stringify(second));

  const p1 = await prisma.playlist.findFirstOrThrow({
    where: { userId: user.id, externalId: "p1" },
  });
  check("refreshes changed metadata", p1.title === "Morning coffee (2026 edit)" && p1.trackCount === 23);
  check("PRESERVES user curation across sync", p1.visible === true && p1.sortOrder === 99_000, `visible=${p1.visible} sortOrder=${p1.sortOrder}`);

  const p2 = await prisma.playlist.findFirstOrThrow({
    where: { userId: user.id, externalId: "p2" },
  });
  check("flags vanished playlist stale instead of deleting", p2.isStale === true);

  const p3 = await prisma.playlist.findFirstOrThrow({
    where: { userId: user.id, externalId: "p3" },
  });
  check("new playlist sorts after existing ones", p3.sortOrder > 99_000, `sortOrder=${p3.sortOrder}`);

  // --- Sync #3: p2 comes back ---
  const refreshed2 = await prisma.connectedAccount.findUniqueOrThrow({
    where: { id: connection.id },
  });
  playlistPayload = spotifyPage([
    makeItem("p1", "Morning coffee (2026 edit)", 23),
    makeItem("p2", "Gym", 55),
    makeItem("p3", "Late night", 8),
  ]);
  await syncProvider({ userId: user.id, connection: { ...refreshed2, provider: "SPOTIFY" } });

  const p2Back = await prisma.playlist.findFirstOrThrow({
    where: { userId: user.id, externalId: "p2" },
  });
  check("un-flags a playlist that reappears", p2Back.isStale === false);

  // Cleanup
  await prisma.playlist.deleteMany({ where: { userId: user.id } });
  await prisma.connectedAccount.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  console.log(
    failures === 0 ? "\nAll sync checks passed." : `\n${failures} sync check(s) FAILED.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
