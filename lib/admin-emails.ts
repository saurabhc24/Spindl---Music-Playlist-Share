/**
 * Who counts as an admin.
 *
 * Kept free of Next.js imports so the policy can be reasoned about (and tested)
 * on its own, separately from the session/redirect glue in lib/admin.ts.
 *
 * The list lives in the ADMIN_EMAILS environment variable rather than a column on
 * User, so admin status sits outside the data the application writes: anyone who
 * finds a way to write to the database still can't promote themselves, and there
 * is no "grant admin" code path to get wrong. The cost is that changing the list
 * requires a redeploy, which is the right trade for a list that should change
 * roughly never.
 *
 * Read from the environment on each call rather than cached at module load, so
 * the value is picked up correctly in every runtime.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Exact match against the whole address -- never a prefix or substring test,
  // which "owner@example.com.attacker.com" would otherwise satisfy.
  return adminEmails().has(email.trim().toLowerCase());
}

export function hasAdminsConfigured(): boolean {
  return adminEmails().size > 0;
}
