-- Moderation override, deliberately separate from the user-controlled isPublic
-- flag so a suspended profile can't be un-hidden from Settings.
-- Both columns are nullable, so this is safe on a table with existing rows.
ALTER TABLE "Profile" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN "suspendedReason" VARCHAR(280);

-- Public lookups filter on suspension, so keep the partial index small: only
-- rows that are actually visible.
CREATE INDEX "Profile_visible_idx" ON "Profile" ("usernameNormalized")
  WHERE "isPublic" = true AND "suspendedAt" IS NULL;
