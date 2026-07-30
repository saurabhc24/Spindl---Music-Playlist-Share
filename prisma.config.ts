import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7's config Datasource type only accepts `url` (+ shadowDatabaseUrl), no
// `directUrl`. The CLI (migrate/studio) uses the url below; the app's runtime
// PrismaClient gets its own connection string via the driver adapter in
// lib/prisma.ts. We prefer the *unpooled* connection here because migrations
// shouldn't run through a PgBouncer-style pooler, and fall back to the pooled one.
//
// Deliberately NOT using prisma/config's `env()` helper: it throws when a variable
// is missing, which breaks `prisma generate` (a step that needs no database) during
// a deploy's install phase before DB env vars are available.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
