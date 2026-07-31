import { cache } from "react";

import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/username";

/**
 * Loads a public profile and the playlists it chooses to show, in display order.
 * Memoized per render pass so `generateMetadata` and the page body share one query.
 *
 * The profile lookup is a single indexed hit on Profile.usernameNormalized.
 */
export const getPublicProfile = cache(async (username: string) => {
  const normalized = normalizeUsername(username);

  const profile = await prisma.profile.findUnique({
    where: { usernameNormalized: normalized },
  });

  // Two independent reasons a page may be invisible: the owner turned it off,
  // or an admin suspended it. Both render as an ordinary 404 -- a suspended page
  // shouldn't announce that it was suspended.
  if (!profile || !profile.isPublic || profile.suspendedAt) return null;

  const playlists = await prisma.playlist.findMany({
    where: { userId: profile.userId, visible: true },
    orderBy: { sortOrder: "asc" },
  });

  return { profile, playlists };
});

/**
 * Looks up a username a profile used to hold, so a stale link can redirect to
 * the current one rather than 404. Only consulted after the profile lookup
 * misses, so the common path stays a single query.
 *
 * Returns null until renames ship and this table starts getting rows.
 */
export const getRenamedProfileTarget = cache(async (username: string) => {
  const normalized = normalizeUsername(username);

  const historical = await prisma.usernameHistory.findUnique({
    where: { usernameNormalized: normalized },
    select: {
      user: {
        select: {
          profile: {
            select: {
              usernameNormalized: true,
              isPublic: true,
              suspendedAt: true,
            },
          },
        },
      },
    },
  });

  const target = historical?.user.profile;
  // Don't redirect onto a page that is itself hidden or suspended -- that would
  // turn a 404 into a redirect to another 404, and leak that the account exists.
  if (!target || !target.isPublic || target.suspendedAt) return null;

  return target.usernameNormalized;
});
