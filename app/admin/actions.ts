"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export type AdminActionState = { error?: string; success?: string } | undefined;

const suspendSchema = z.object({
  profileId: z.string().min(1),
  reason: z.string().trim().max(280).optional(),
});

export async function suspendProfile(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const parsed = suspendSchema.safeParse({
    profileId: formData.get("profileId"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return { error: "Invalid request." };

  const profile = await prisma.profile.findUnique({
    where: { id: parsed.data.profileId },
    select: { usernameNormalized: true, userId: true },
  });
  if (!profile) return { error: "Profile not found." };

  // An admin suspending their own page is almost certainly a misclick, and it
  // would hide the account they need to undo it from.
  if (profile.userId === admin.id) {
    return { error: "You can't suspend your own profile." };
  }

  await prisma.profile.update({
    where: { id: parsed.data.profileId },
    data: {
      suspendedAt: new Date(),
      suspendedReason: parsed.data.reason || null,
    },
  });

  // The page is edge-cached, so without this it stays publicly readable until
  // the cache expires -- which defeats the point of suspending it.
  revalidatePath(`/${profile.usernameNormalized}`);
  revalidatePath("/admin");

  return { success: `Suspended /${profile.usernameNormalized}.` };
}

export async function unsuspendProfile(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) return { error: "Invalid request." };

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { usernameNormalized: true },
  });
  if (!profile) return { error: "Profile not found." };

  await prisma.profile.update({
    where: { id: profileId },
    data: { suspendedAt: null, suspendedReason: null },
  });

  revalidatePath(`/${profile.usernameNormalized}`);
  revalidatePath("/admin");

  return { success: `Restored /${profile.usernameNormalized}.` };
}

export async function deleteAccount(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const profileId = String(formData.get("profileId") ?? "");
  const confirmation = String(formData.get("confirmUsername") ?? "").trim();

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { usernameNormalized: true, userId: true },
  });
  if (!profile) return { error: "Profile not found." };

  if (profile.userId === admin.id) {
    return { error: "You can't delete your own account from here." };
  }

  // Irreversible and cascades to playlists, connections and sessions, so require
  // the username to be typed rather than trusting a single click.
  if (confirmation.toLowerCase() !== profile.usernameNormalized) {
    return { error: "Type the username exactly to confirm deletion." };
  }

  await prisma.user.delete({ where: { id: profile.userId } });

  revalidatePath(`/${profile.usernameNormalized}`);
  revalidatePath("/admin");

  return { success: `Deleted /${profile.usernameNormalized} and all its data.` };
}
