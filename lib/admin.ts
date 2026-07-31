import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { isAdminEmail } from "@/lib/admin-emails";
import { auth } from "@/lib/auth";

export { isAdminEmail, hasAdminsConfigured } from "@/lib/admin-emails";

export const getAdminUser = cache(async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!session?.user?.id || !isAdminEmail(email)) return null;
  return session.user;
});

/**
 * Gate for every admin route and action.
 *
 * Responds with 404 rather than 403 so the admin area isn't discoverable by
 * probing -- a signed-in non-admin sees exactly what a logged-out stranger sees.
 */
export const requireAdmin = cache(async () => {
  const user = await getAdminUser();
  if (!user) notFound();
  return user;
});
