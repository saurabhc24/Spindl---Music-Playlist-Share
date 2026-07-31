import "dotenv/config";

// Access control for the admin area, plus the moderation semantics that make
// suspension actually stick.
//   npx tsx --conditions=react-server tests/admin.check.mts

process.env.ADMIN_EMAILS = " Owner@Example.com , second@example.com ";

// Import the pure policy module, not lib/admin.ts, which pulls in Next's
// navigation helpers and therefore React's client runtime.
const { isAdminEmail, hasAdminsConfigured } = await import("../lib/admin-emails");
const { PrismaClient } = await import("../app/generated/prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

console.log("\nAdmin allowlist");
check("admins are configured", hasAdminsConfigured());
check("exact match grants access", isAdminEmail("second@example.com"));
check("match is case-insensitive", isAdminEmail("OWNER@EXAMPLE.COM"));
check("surrounding whitespace is tolerated", isAdminEmail("  owner@example.com "));
check("a non-listed email is denied", !isAdminEmail("someone@example.com"));
check("empty is denied", !isAdminEmail(""));
check("null is denied", !isAdminEmail(null));
check("a substring of an admin email is denied", !isAdminEmail("owner@example.com.evil.com"));

// The allowlist is read from the environment per call, not cached at import, so
// clearing it takes effect immediately -- worth asserting, since a cached copy
// would keep granting access after the variable was removed.
process.env.ADMIN_EMAILS = "";
check(
  "clearing the variable revokes access immediately",
  !hasAdminsConfigured() && !isAdminEmail("owner@example.com")
);

// --- suspension semantics ----------------------------------------------------

console.log("\nSuspension");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const suffix = Date.now().toString(36);
const name = `mod${suffix}`;
const user = await prisma.user.create({
  data: { email: `mod-${suffix}@example.com` },
});

try {
  await prisma.profile.create({
    data: { userId: user.id, username: name, usernameNormalized: name },
  });

  // Mirrors lib/profile.ts getPublicProfile visibility rule.
  const visible = async () => {
    const p = await prisma.profile.findUnique({
      where: { usernameNormalized: name },
    });
    return Boolean(p && p.isPublic && !p.suspendedAt);
  };

  check("a new profile is publicly visible", await visible());

  await prisma.profile.update({
    where: { userId: user.id },
    data: { suspendedAt: new Date(), suspendedReason: "test" },
  });
  check("suspending hides the profile", !(await visible()));

  // The point of a separate column: the user's own toggle must not undo it.
  await prisma.profile.update({
    where: { userId: user.id },
    data: { isPublic: true },
  });
  check(
    "a suspended user cannot un-hide themselves via isPublic",
    !(await visible())
  );

  await prisma.profile.update({
    where: { userId: user.id },
    data: { suspendedAt: null, suspendedReason: null },
  });
  check("restoring makes it visible again", await visible());

  // Deleting the account must take its data with it.
  const connection = await prisma.connectedAccount.create({
    data: { userId: user.id, provider: "SPOTIFY" },
  });
  await prisma.playlist.create({
    data: {
      userId: user.id,
      connectedAccountId: connection.id,
      provider: "SPOTIFY",
      externalId: "x1",
      title: "t",
      externalUrl: "https://example.com",
    },
  });

  await prisma.user.delete({ where: { id: user.id } });

  check(
    "deleting the account cascades to profile, playlists and connections",
    (await prisma.profile.findUnique({ where: { usernameNormalized: name } })) === null &&
      (await prisma.playlist.count({ where: { userId: user.id } })) === 0 &&
      (await prisma.connectedAccount.count({ where: { userId: user.id } })) === 0
  );
} finally {
  await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.$disconnect();
}

console.log(
  failures === 0 ? "\nAll admin checks passed." : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
