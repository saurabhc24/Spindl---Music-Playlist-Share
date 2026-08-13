"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { validateUsername } from "@/lib/username";

export type ClaimUsernameState = { error?: string } | undefined;

export async function claimUsername(
  _prevState: ClaimUsernameState,
  formData: FormData
): Promise<ClaimUsernameState> {
  const user = await requireUser();

  // Per-IP, deliberately: this is the choke point on account farming. Someone
  // creating throwaway accounts to bypass our per-account limits (or to squat
  // desirable usernames) has to claim a username each time, and they'll come
  // from the same handful of IPs.
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "unknown";

  const limited = await rateLimit(
    `claim:ip:${ip}`,
    RATE_LIMITS.claimUsernamePerIp
  );
  if (!limited.ok) {
    return {
      error: "Too many attempts from this network. Please try again later.",
    };
  }

  // Server-side validation is the source of truth; the client runs the same
  // rules only to give faster feedback.
  const validation = validateUsername(formData.get("username"));
  if (!validation.ok) return { error: validation.message };

  const { username, normalized } = validation;

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (existingProfile) redirect("/dashboard");

  try {
    // No pre-check for availability here on purpose. Any SELECT-then-INSERT is a
    // TOCTOU race: two requests can both see the name free and both proceed. The
    // unique index on usernameNormalized is the only thing that can actually
    // arbitrate, so we just attempt the insert and handle losing.
    await prisma.$transaction(async (tx) => {
      await tx.profile.create({
        data: {
          userId: user.id,
          username,
          usernameNormalized: normalized,
          displayName: user.name ?? username,
          avatarUrl: user.image ?? null,
        },
      });

      // If this name was previously released by someone else, that redirect must
      // stop now that a new owner holds it -- otherwise old links would point at
      // the wrong profile.
      await tx.usernameHistory.deleteMany({
        where: { usernameNormalized: normalized },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // Distinguish the two unique constraints on this table: losing the race
      // for a name is a retryable message, whereas a duplicate userId means the
      // profile already exists (double submit).
      if (constraintTargets(error).some((t) => t.includes("usernameNormalized"))) {
        return {
          error: "That username was just taken. Please try another.",
        };
      }
      redirect("/dashboard");
    }
    throw error;
  }

  // The public route is ISR-cached, so a visit to this username *before* it was
  // claimed cached a 404. Without this, that 404 would keep being served from
  // the edge after the page went live.
  revalidatePath(`/${normalized}`);

  // The flag rides in the URL rather than in a column, because this is the only
  // place that can know the account was created *just now* -- and the dashboard
  // strips it the moment it plays, so it can't be replayed by a refresh. The
  // other two returns above redirect without it: they are the double-submit and
  // already-claimed paths, and neither is a new account.
  redirect("/dashboard?welcome=1");
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Prisma reports the offending columns in meta.target. */
function constraintTargets(error: unknown): string[] {
  const meta = (error as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];
  return [];
}
