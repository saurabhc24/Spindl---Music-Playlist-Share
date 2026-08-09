import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * A count for a period next to the one before it, which is the only way a
 * signup number means anything -- eleven this week is good or bad entirely
 * depending on last week.
 */
export type SignupTrend = {
  current: number;
  previous: number;
  /**
   * Null when the previous period was zero. A percentage change from nothing is
   * either undefined or infinite depending on how you squint, and rendering it
   * as "+100%" or "+∞%" would both be lies -- the UI shows the pair of raw
   * counts instead.
   */
  changePercent: number | null;
};

export type AdminMetrics = {
  /** Everyone who has ever signed up, whether or not they claimed a username. */
  totalUsers: number;
  /** Signed up and not suspended. Deleted accounts are gone, not counted here. */
  activeUsers: number;
  suspendedUsers: number;
  week: SignupTrend;
  month: SignupTrend;
};

type Buckets = {
  weekCurrent: number;
  weekPrevious: number;
  monthCurrent: number;
  monthPrevious: number;
};

function trend(current: number, previous: number): SignupTrend {
  return {
    current,
    previous,
    changePercent:
      previous === 0 ? null : Math.round(((current - previous) / previous) * 100),
  };
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [totalUsers, suspendedUsers, buckets] = await Promise.all([
    prisma.user.count(),
    prisma.profile.count({ where: { suspendedAt: { not: null } } }),
    // All four windows in one pass, off the database's clock rather than
    // Date.now(): reading the clock during render is impure, and four separate
    // queries could each land on a different second and fail to add up. The
    // ::int casts matter -- count() is bigint, which arrives as a BigInt that
    // JSON and React both refuse to render.
    prisma.$queryRaw<Buckets[]>`
      SELECT
        count(*) FILTER (
          WHERE "createdAt" >= now() - interval '7 days'
        )::int AS "weekCurrent",
        count(*) FILTER (
          WHERE "createdAt" >= now() - interval '14 days'
            AND "createdAt" <  now() - interval '7 days'
        )::int AS "weekPrevious",
        count(*) FILTER (
          WHERE "createdAt" >= now() - interval '30 days'
        )::int AS "monthCurrent",
        count(*) FILTER (
          WHERE "createdAt" >= now() - interval '60 days'
            AND "createdAt" <  now() - interval '30 days'
        )::int AS "monthPrevious"
      FROM "User"
    `,
  ]);

  const row = buckets[0];

  return {
    totalUsers,
    suspendedUsers,
    // Suspension is a flag on Profile, so only someone who claimed a username
    // can hold it -- which is why this subtracts from the user count directly
    // rather than counting unsuspended profiles, a figure that would quietly
    // exclude everyone still mid-signup.
    activeUsers: totalUsers - suspendedUsers,
    week: trend(row?.weekCurrent ?? 0, row?.weekPrevious ?? 0),
    month: trend(row?.monthCurrent ?? 0, row?.monthPrevious ?? 0),
  };
}
