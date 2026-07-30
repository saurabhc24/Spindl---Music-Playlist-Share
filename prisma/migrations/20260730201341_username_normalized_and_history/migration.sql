-- Split username into a display value and a normalized uniqueness key, and add
-- UsernameHistory so future renames can 301 instead of 404.
--
-- Written by hand rather than generated: the generated version adds
-- `usernameNormalized TEXT NOT NULL` in one step, which fails on any table that
-- already has rows. This adds the column nullable, backfills, then tightens it.

-- 1. Add the normalized column, nullable for now.
ALTER TABLE "Profile" ADD COLUMN "usernameNormalized" TEXT;

-- 2. Backfill. Existing usernames were validated as lowercase ASCII, so lower()
--    matches what the application's NFKC + lowercase normalization would produce.
--    (Postgres has no NFKC normalizer before v13's `normalize()`; ASCII data makes
--    that moot here.)
UPDATE "Profile" SET "usernameNormalized" = lower("username")
WHERE "usernameNormalized" IS NULL;

-- 3. Now that every row has a value, enforce it.
ALTER TABLE "Profile" ALTER COLUMN "usernameNormalized" SET NOT NULL;

-- 4. Uniqueness moves from the display column to the normalized one. This is the
--    constraint the application relies on to settle races between two
--    simultaneous claims of the same name in different cases.
DROP INDEX "Profile_username_key";
CREATE UNIQUE INDEX "Profile_usernameNormalized_key" ON "Profile"("usernameNormalized");

-- 5. History of released usernames.
CREATE TABLE "UsernameHistory" (
    "id" TEXT NOT NULL,
    "usernameNormalized" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UsernameHistory_usernameNormalized_key" ON "UsernameHistory"("usernameNormalized");
CREATE INDEX "UsernameHistory_userId_idx" ON "UsernameHistory"("userId");

ALTER TABLE "UsernameHistory" ADD CONSTRAINT "UsernameHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
