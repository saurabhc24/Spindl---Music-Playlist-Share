import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Authoritative session check. Use this in server components, server actions and
 * route handlers -- the proxy's cookie check is only optimistic. Memoized per
 * render pass so multiple callers in one request share a single lookup.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
});

/**
 * Requires both a session and a claimed username. Everything under /dashboard
 * needs a Profile to exist, since playlists and the public page hang off it.
 */
export const requireProfile = cache(async () => {
  const user = await requireUser();
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) redirect("/onboarding/username");
  return { user, profile };
});

export const getProfile = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.profile.findUnique({ where: { userId: session.user.id } });
});
