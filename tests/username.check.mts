import "dotenv/config";

// Covers the username spec's acceptance criteria. The concurrency test needs a
// live database (DATABASE_URL); everything else is pure.
//   npx tsx --conditions=react-server tests/username.check.mts

const { validateUsername, normalizeUsername } = await import(
  "../lib/username"
);
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

const accepts = (input: string) => validateUsername(input).ok;
const rejectsWith = (input: string, error: string) => {
  const result = validateUsername(input);
  return !result.ok && result.error === error;
};

// --- normalization -----------------------------------------------------------

console.log("\nNormalization");
check("lowercases", normalizeUsername("JohnDoe") === "johndoe");
check(
  "NFKC folds fullwidth characters to ASCII",
  normalizeUsername("ｈｅｌｌｏ") === "hello",
  normalizeUsername("ｈｅｌｌｏ")
);
check(
  "NFKC expands ligatures",
  normalizeUsername("ﬁx") === "fix",
  normalizeUsername("ﬁx")
);
check("trims surrounding whitespace", normalizeUsername("  bob  ") === "bob");

// Acceptance: JohnDoe and johndoe are the same username.
check(
  "JohnDoe and johndoe normalize identically",
  normalizeUsername("JohnDoe") === normalizeUsername("johndoe")
);

// A visual twin must collapse onto the original rather than registering beside it.
const twin = validateUsername("ｄｅｍｏ");
check(
  "a fullwidth twin of an existing name normalizes onto it",
  twin.ok && twin.normalized === "demo",
  twin.ok ? twin.normalized : "rejected"
);

// --- length ------------------------------------------------------------------

console.log("\nLength");
check("rejects 2 characters", rejectsWith("ab", "too_short"));
check("accepts 3 characters", accepts("abc"));
check("accepts 20 characters", accepts("a".repeat(20)));
check("rejects 21 characters", rejectsWith("a".repeat(21), "too_long"));

// --- allowed characters ------------------------------------------------------

console.log("\nCharacters");
check("accepts alphanumerics", accepts("user123"));
check("accepts internal period", accepts("john.doe"));
check("accepts internal underscore", accepts("john_doe"));
check("accepts both separators", accepts("a.b_c"));
check("rejects leading period", rejectsWith(".john", "invalid_characters"));
check("rejects trailing period", rejectsWith("john.", "invalid_characters"));
check("rejects leading underscore", rejectsWith("_john", "invalid_characters"));
check("rejects trailing underscore", rejectsWith("john_", "invalid_characters"));
check("rejects consecutive periods", rejectsWith("john..doe", "invalid_characters"));
check("rejects consecutive underscores", rejectsWith("john__doe", "invalid_characters"));
check("rejects mixed consecutive separators", rejectsWith("john._doe", "invalid_characters"));
check("rejects hyphens", rejectsWith("john-doe", "invalid_characters"));
check("rejects spaces", rejectsWith("john doe", "invalid_characters"));
check("rejects non-ASCII letters", rejectsWith("jöhn", "invalid_characters"));
check("rejects emoji", rejectsWith("john😀", "invalid_characters"));

// --- reserved and profanity --------------------------------------------------

console.log("\nReserved words");
check("rejects a route name", rejectsWith("admin", "reserved"));
check("rejects a brand term", rejectsWith("spindl", "reserved"));
check("rejects regardless of case", rejectsWith("ADMIN", "reserved"));
check("rejects an integration name", rejectsWith("spotify", "reserved"));
check(
  "rejects a reserved word disguised with separators",
  rejectsWith("a.d.m.i.n", "reserved")
);
check("rejects a severe slur padded with characters", rejectsWith("xxniggerxx", "profane"));
check(
  "does NOT reject an innocent name containing a mild substring",
  accepts("classic"),
  "Scunthorpe check"
);
check("does not reject a normal name", accepts("saurabh"));
// Reserved-ness is only ever consulted through validateUsername, which is the
// single path every caller takes, so that is what gets asserted.
check(
  "reservation is reported through validateUsername",
  (validateUsername("Admin") as { error?: string }).error === "reserved" &&
    validateUsername("saurabh").ok
);

// --- display form preserved --------------------------------------------------

console.log("\nDisplay form");
const mixed = validateUsername("JohnDoe");
check(
  "keeps the as-typed value for display",
  mixed.ok && mixed.username === "JohnDoe" && mixed.normalized === "johndoe",
  mixed.ok ? `${mixed.username}/${mixed.normalized}` : "rejected"
);

// --- race safety (live DB) ---------------------------------------------------

console.log("\nConcurrency");
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const suffix = Date.now().toString(36);
const contested = `race${suffix}`;

try {
  const [userA, userB] = await Promise.all([
    prisma.user.create({ data: { email: `race-a-${suffix}@example.com` } }),
    prisma.user.create({ data: { email: `race-b-${suffix}@example.com` } }),
  ]);

  // Acceptance: two simultaneous claims of the same name in different cases must
  // not both succeed. Both go through validateUsername so they collide on the
  // normalized key exactly as two real signups would.
  const claim = (userId: string, typed: string) => {
    const validation = validateUsername(typed);
    if (!validation.ok) throw new Error("fixture username is invalid");
    return prisma.profile.create({
      data: {
        userId,
        username: validation.username,
        usernameNormalized: validation.normalized,
      },
    });
  };

  const results = await Promise.allSettled([
    claim(userA.id, contested.toUpperCase()),
    claim(userB.id, contested.toLowerCase()),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  check(
    "exactly one of two simultaneous same-name claims succeeds",
    fulfilled.length === 1 && rejected.length === 1,
    `fulfilled=${fulfilled.length} rejected=${rejected.length}`
  );

  const loser = rejected[0] as PromiseRejectedResult | undefined;
  const loserCode = (loser?.reason as { code?: string } | undefined)?.code;
  check(
    "the losing claim fails with a unique-constraint error (P2002)",
    loserCode === "P2002",
    `code=${loserCode}`
  );

  const stored = await prisma.profile.findMany({
    where: { usernameNormalized: contested },
  });
  check("only one row exists for the contested name", stored.length === 1, `rows=${stored.length}`);
  check(
    "the winner's as-typed casing is preserved",
    stored[0]?.username.toLowerCase() === contested,
    stored[0]?.username
  );

  // Case-insensitive lookup: whichever casing won, the lowercase key finds it.
  const found = await prisma.profile.findUnique({
    where: { usernameNormalized: normalizeUsername(contested.toUpperCase()) },
  });
  check("lookup by either casing resolves to the same row", found?.id === stored[0]?.id);

  await prisma.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
} finally {
  await prisma.$disconnect();
}

console.log(
  failures === 0 ? "\nAll username checks passed." : `\n${failures} check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
