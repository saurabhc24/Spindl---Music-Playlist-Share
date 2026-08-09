-- Reversible account deletion. The User row now survives an admin delete so the
-- deletion can be counted and undone; every read path that could resurface the
-- account filters on "deletedAt".
--
-- All three columns are nullable, so this is safe on a table with existing rows.
-- Accounts deleted before this migration left nothing behind and cannot be
-- backfilled -- the count starts from zero here.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletedEmail" TEXT;
ALTER TABLE "User" ADD COLUMN "deletedReason" VARCHAR(280);

-- Partial: the overwhelming majority of rows are not deleted, and every query
-- that touches this column is looking for the few that are.
CREATE INDEX "User_deletedAt_idx" ON "User" ("deletedAt")
  WHERE "deletedAt" IS NOT NULL;

-- Daily visit counter, written by the beacon in the root layout. One row per
-- day keyed by the date, so a visit is a single upsert that cannot race two rows
-- into existence for the same day.
CREATE TABLE "DailyVisit" (
  "day"   DATE    NOT NULL,
  "views" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "DailyVisit_pkey" PRIMARY KEY ("day")
);
