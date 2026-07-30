"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { usernameSchema } from "@/lib/username";

export type ClaimUsernameState = { error?: string } | undefined;

export async function claimUsername(
  _prevState: ClaimUsernameState,
  formData: FormData
): Promise<ClaimUsernameState> {
  const user = await requireUser();

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
