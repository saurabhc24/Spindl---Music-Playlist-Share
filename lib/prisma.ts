import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// node-postgres over TCP works for both a local Postgres and Neon's pooled
// endpoint, so the same client code runs in dev and on Vercel. (Neon's
// serverless HTTP driver is only needed on the edge runtime, which we don't use.)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
