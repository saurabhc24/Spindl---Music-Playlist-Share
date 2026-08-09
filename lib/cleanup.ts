import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Housekeeping for a small (free-tier) database.
 *
 * Deliberately conservative about what it deletes. Expired sessions and
 * verification tokens are pure garbage -- Auth.js writes them and never cleans
 * them up, and they accumulate fastest of anything here. Abandoned signups are
 * accounts that authenticated but never claimed a username, so they have no
 * public page and nothing a user would miss.
 *
 * What this does NOT do is delete established accounts for inactivity. That
 * destroys real user data (and breaks live shared links) and should be a
 * product decision with email warnings first, not a silent cron job.
 */

/** Grace period before an account with no claimed username is considered dead. */
const ABANDONED_SIGNUP_DAYS = 30;

export type CleanupResult = {
  expiredSessions: number;
  expiredVerificationTokens: number;
  abandonedSignups: number;
  dryRun: boolean;
};

export async function runCleanup({
  dryRun = false,
}: { dryRun?: boolean } = {}): Promise<CleanupResult> {
  const now = new Date();
  const abandonedCutoff = new Date(
    now.getTime() - ABANDONED_SIGNUP_DAYS * 24 * 60 * 60 * 1000
  );

  const abandonedWhere = {
    profile: { is: null },
    createdAt: { lt: abandonedCutoff },
    // A deleted account with no username would otherwise match this and get
    // hard-deleted a month later, silently taking the deletion record with it
    // and walking the admin page's deleted count backwards.
    deletedAt: null,
  };

  if (dryRun) {
    const [expiredSessions, expiredVerificationTokens, abandonedSignups] =
      await Promise.all([
        prisma.session.count({ where: { expires: { lt: now } } }),
        prisma.verificationToken.count({ where: { expires: { lt: now } } }),
        prisma.user.count({ where: abandonedWhere }),
      ]);

    return {
      expiredSessions,
      expiredVerificationTokens,
      abandonedSignups,
      dryRun: true,
    };
  }

  const [sessions, tokens, users] = await Promise.all([
    prisma.session.deleteMany({ where: { expires: { lt: now } } }),
    prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    // Cascades remove their ConnectedAccount/Playlist rows too.
    prisma.user.deleteMany({ where: abandonedWhere }),
  ]);

  return {
    expiredSessions: sessions.count,
    expiredVerificationTokens: tokens.count,
    abandonedSignups: users.count,
    dryRun: false,
  };
}
