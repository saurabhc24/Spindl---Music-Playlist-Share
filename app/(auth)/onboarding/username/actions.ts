"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { usernameSchema } from "@/lib/username";

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

  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const username = parsed.data;

  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  if (existingProfile) redirect("/dashboard");

  try {
    await prisma.profile.create({
      data: {
        userId: user.id,
        username,
        displayName: user.name ?? username,
        avatarUrl: user.image ?? null,
      },
    });
  } catch (error) {
    // The unique constraint is the real arbiter here -- two people can pass the
    // availability check simultaneously and only one insert can win.
    if (isUniqueConstraintError(error)) {
      return { error: "That username is already taken. Try another." };
    }
    throw error;
  }

  // The public route is ISR-cached, so a visit to this username *before* it was
  // claimed cached a 404. Without this, that 404 would keep being served from
  // the edge after the page went live.
  revalidatePath(`/${username}`);

  redirect("/dashboard");
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
