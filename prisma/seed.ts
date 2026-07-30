import "dotenv/config";

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Development fixture: one profile with a mix of Spotify and YouTube playlists,
// including a hidden one and a stale one, so every UI state has something to show.
const DEMO_EMAIL = "demo@example.com";
const DEMO_USERNAME = "demo";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo Listener",
      emailVerified: new Date(),
    },
  });

  const profile = await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      username: DEMO_USERNAME,
      usernameNormalized: DEMO_USERNAME,
      displayName: "Demo Listener",
      bio: "Late-night mixes, road-trip singalongs, and whatever I had on repeat this month.",
    },
  });

  const spotify = await prisma.connectedAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: "SPOTIFY" } },
    update: { lastSyncedAt: new Date(), lastSyncStatus: "ok" },
    create: {
      userId: user.id,
      provider: "SPOTIFY",
      lastSyncedAt: new Date(),
      lastSyncStatus: "ok",
    },
  });

  const youtube = await prisma.connectedAccount.upsert({
    where: { userId_provider: { userId: user.id, provider: "YOUTUBE" } },
    update: { lastSyncedAt: new Date(), lastSyncStatus: "ok" },
    create: {
      userId: user.id,
      provider: "YOUTUBE",
      lastSyncedAt: new Date(),
      lastSyncStatus: "ok",
    },
  });

  const fixtures = [
    {
      connectedAccountId: spotify.id,
      provider: "SPOTIFY" as const,
      externalId: "demo-spotify-1",
      title: "3am and still driving",
      coverImageUrl: null,
      externalUrl: "https://open.spotify.com/playlist/demo-spotify-1",
      trackCount: 42,
      visible: true,
      sortOrder: 1000,
      isStale: false,
    },
    {
      connectedAccountId: youtube.id,
      provider: "YOUTUBE" as const,
      externalId: "demo-youtube-1",
      title: "Live sets I keep coming back to",
      coverImageUrl: null,
      externalUrl: "https://www.youtube.com/playlist?list=demo-youtube-1",
      trackCount: 17,
      visible: true,
      sortOrder: 2000,
      isStale: false,
    },
    {
      connectedAccountId: spotify.id,
      provider: "SPOTIFY" as const,
      externalId: "demo-spotify-2",
      title: "Kitchen dancing",
      coverImageUrl: null,
      externalUrl: "https://open.spotify.com/playlist/demo-spotify-2",
      trackCount: 88,
      visible: true,
      sortOrder: 3000,
      isStale: false,
    },
    {
      connectedAccountId: spotify.id,
      provider: "SPOTIFY" as const,
      externalId: "demo-spotify-hidden",
      title: "Guilty pleasures (hidden)",
      coverImageUrl: null,
      externalUrl: "https://open.spotify.com/playlist/demo-spotify-hidden",
      trackCount: 12,
      visible: false,
      sortOrder: 4000,
      isStale: false,
    },
    {
      connectedAccountId: youtube.id,
      provider: "YOUTUBE" as const,
      externalId: "demo-youtube-stale",
      title: "Deleted upstream",
      coverImageUrl: null,
      externalUrl: "https://www.youtube.com/playlist?list=demo-youtube-stale",
      trackCount: null,
      visible: false,
      sortOrder: 5000,
      isStale: true,
    },
  ];

  for (const fixture of fixtures) {
    await prisma.playlist.upsert({
      where: {
        userId_provider_externalId: {
          userId: user.id,
          provider: fixture.provider,
          externalId: fixture.externalId,
        },
      },
      update: fixture,
      create: { userId: user.id, ...fixture },
    });
  }

  const visible = await prisma.playlist.count({
    where: { userId: user.id, visible: true },
  });

  console.log(`Seeded @${profile.username}: ${fixtures.length} playlists (${visible} visible).`);
  console.log(`View at /${profile.username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
