import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// node-postgres over TCP works for both a local Postgres and Neon's pooled
// endpoint, so the same client code runs in dev and on Vercel. (Neon's
// serverless HTTP driver is only needed on the edge runtime, which we don't use.)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Pool sizing matters on serverless: every warm instance keeps its own pool, so
// a large `max` multiplied across instances can exhaust the database's
// connection limit (Neon's free tier is small). A handful per instance is plenty
// given each request does a few short queries.
const POOL_MAX = Number(process.env.DATABASE_POOL_MAX ?? 5);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  max: POOL_MAX,
  // Release idle connections rather than holding them for the life of an
  // instance -- also avoids the local dev proxy dropping a stale connection
  // underneath us mid-query.
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
