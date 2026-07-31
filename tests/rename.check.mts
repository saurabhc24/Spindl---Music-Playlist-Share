import "dotenv/config";

// Verifies the username rename path: history is recorded, old links resolve to
// the new profile, and re-claiming a released name breaks the stale redirect.
// Needs a live database.
//   npx tsx --conditions=react-server tests/rename.check.mts

const { PrismaClient } = await import("../app/generated/prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { validateUsername } = await import("../lib/username");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

/** Mirrors the transaction in app/dashboard/settings/actions.ts. */
async function rename(userId: string, typed: string) {
  const validation = validateUsername(typed);
  if (!validation.ok) throw new Error(`fixture invalid: ${validation.message}`);
  const { username, normalized } = validation;

  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId } });

  await prisma.$transaction(async (tx) => {
    await tx.usernameHistory.deleteMany({
      where: { usernameNormalized: normalized },
    });
    await tx.usernameHistory.upsert({
      where: { usernameNormalized: profile.usernameNormalized },
      create: {
        usernameNormalized: profile.usernameNormalized,
        username: profile.username,
        userId,
      },
      update: { userId, username: profile.username, changedAt: new Date() },
    });
    await tx.profile.update({
      where: { userId },
      data: { username, usernameNormalized: normalized },
    });
  });
}

/** Mirrors lib/profile.ts getRenamedProfileTarget. */
async function redirectTargetFor(normalized: string) {
  const historical = await prisma.usernameHistory.findUnique({
    where: { usernameNormalized: normalized },
    select: {
      user: { select: { profile: { select: { usernameNormalized: true } } } },
    },
  });
  return historical?.user.profile?.usernameNormalized ?? null;
}

const suffix = Date.now().toString(36);
const nameA = `rn${suffix}a`;
const nameB = `rn${suffix}b`;

const userA = await prisma.user.create({
  data: { email: `rename-a-${suffix}@example.com` },
});
const userB = await prisma.user.create({
  data: { email: `rename-b-${suffix}@example.com` },
});

try {
  await prisma.profile.create({
    data: { userId: userA.id, username: nameA, usernameNormalized: nameA },
  });

  // --- rename A -> B ---
  await rename(userA.id, nameB);

  const afterRename = await prisma.profile.findUniqueOrThrow({
    where: { userId: userA.id },
  });
  check("profile now holds the new username", afterRename.usernameNormalized === nameB);

  check(
    "the old username is recorded in history",
    (await prisma.usernameHistory.findUnique({
      where: { usernameNormalized: nameA },
    })) !== null
  );

  check(
    "old link resolves to the current username",
    (await redirectTargetFor(nameA)) === nameB,
    String(await redirectTargetFor(nameA))
  );

  check(
    "the released name is free for someone else",
    (await prisma.profile.findUnique({ where: { usernameNormalized: nameA } })) === null
  );

  // --- someone else claims the released name ---
  await prisma.usernameHistory.deleteMany({ where: { usernameNormalized: nameA } });
  await prisma.profile.create({
    data: { userId: userB.id, username: nameA, usernameNormalized: nameA },
  });

  check(
    "claiming a released name clears the stale redirect",
    (await redirectTargetFor(nameA)) === null,
    String(await redirectTargetFor(nameA))
  );

  const liveOwner = await prisma.profile.findUniqueOrThrow({
    where: { usernameNormalized: nameA },
  });
  check(
    "the released name now resolves to its new owner, not a redirect",
    liveOwner.userId === userB.id
  );

  // --- renaming back is allowed once free ---
  const nameC = `rn${suffix}c`;
  await rename(userA.id, nameC);
  check(
    "a second rename chains history without collision",
    (await redirectTargetFor(nameB)) === nameC,
    String(await redirectTargetFor(nameB))
  );
} finally {
  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
  await prisma.$disconnect();
}

console.log(
  failures === 0 ? "\nAll rename checks passed." : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
