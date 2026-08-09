"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export type AdminActionState = { error?: string; success?: string } | undefined;

/**
 * Duck-typed rather than `instanceof PrismaClientKnownRequestError`, matching
 * how the rest of the app tests for this: the error class lives in the generated
 * client, and importing it into a "use server" module drags the whole thing into
 * the action bundle for one comparison.
 */
function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

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

/**
 * Deletes an account without destroying it.
 *
 * The User row stays, flagged, so the deletion can be counted on the admin page
 * and undone if it was a mistake. What actually goes is the ability to use the
 * account: sessions are dropped so any open tab is signed out immediately, the
 * public page 404s, and lib/auth's signIn callback refuses a fresh sign-in.
 *
 * The email moves to `deletedEmail`. It carries a unique index, and leaving it
 * in place would permanently bar that address from signing up again -- which
 * would make the reversible delete more destructive than the hard one it
 * replaced. Playlists and connections are left untouched: they are what a
 * restore has to bring back, and they are unreachable while the flag is set.
 */
export async function deleteAccount(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const profileId = String(formData.get("profileId") ?? "");
  const confirmation = String(formData.get("confirmUsername") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 280);

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      usernameNormalized: true,
      userId: true,
      user: { select: { email: true, deletedAt: true } },
    },
  });
  if (!profile) return { error: "Profile not found." };

  if (profile.userId === admin.id) {
    return { error: "You can't delete your own account from here." };
  }
  if (profile.user.deletedAt) {
    return { error: "That account is already deleted." };
  }

  // Reversible now, but it still signs someone out and takes their page down, so
  // require the username to be typed rather than trusting a single click.
  if (confirmation.toLowerCase() !== profile.usernameNormalized) {
    return { error: "Type the username exactly to confirm deletion." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: profile.userId },
      data: {
        deletedAt: new Date(),
        deletedEmail: profile.user.email,
        deletedReason: reason || null,
        email: null,
      },
    }),
    // Ends any session already open. Without this the flag only takes effect at
    // their next sign-in, which is the one they would never make.
    prisma.session.deleteMany({ where: { userId: profile.userId } }),
  ]);

  revalidatePath(`/${profile.usernameNormalized}`);
  revalidatePath("/admin");

  return { success: `Deleted /${profile.usernameNormalized}.` };
}

/**
 * Puts a deleted account back.
 *
 * The address can have been claimed by a new signup in the meantime -- freeing
 * it is the whole point of moving it aside -- so the unique index is left to
 * arbitrate and its violation is translated, rather than pre-checking and
 * racing.
 */
export async function restoreAccount(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();

  const profileId = String(formData.get("profileId") ?? "");
  if (!profileId) return { error: "Invalid request." };

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      usernameNormalized: true,
      userId: true,
      user: { select: { deletedEmail: true, deletedAt: true } },
    },
  });
  if (!profile) return { error: "Profile not found." };
  if (!profile.user.deletedAt) return { error: "That account isn't deleted." };

  try {
    await prisma.user.update({
      where: { id: profile.userId },
      data: {
        deletedAt: null,
        deletedReason: null,
        email: profile.user.deletedEmail,
        deletedEmail: null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        error:
          "Someone has since signed up with that email address, so this account can't be restored.",
      };
    }
    throw error;
  }

  revalidatePath(`/${profile.usernameNormalized}`);
  revalidatePath("/admin");

  return { success: `Restored /${profile.usernameNormalized}.` };
}
