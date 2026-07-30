import { cache } from "react";

import { prisma } from "@/lib/prisma";

/**
 * Loads a public profile and the playlists it chooses to show, in display order.
 * Memoized per render pass so `generateMetadata` and the page body share one query.
 */
export const getPublicProfile = cache(async (username: string) => {
  const profile = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
  });

  if (!profile || !profile.isPublic) return null;

  const playlists = await prisma.playlist.findMany({
    where: { userId: profile.userId, visible: true },
    orderBy: { sortOrder: "asc" },
  });

  return { profile, playlists };
});
