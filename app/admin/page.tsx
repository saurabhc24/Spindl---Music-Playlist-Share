import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

import { ProfileRow, type AdminProfile } from "./profile-row";

// Always live: an admin acting on stale moderation data is worse than a slow page.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminPage(props: PageProps<"/admin">) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const rawQuery = searchParams.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const rawPage = searchParams.page;
  const page = Math.max(
    1,
    Number(Array.isArray(rawPage) ? rawPage[0] : rawPage) || 1
  );

  const where = query
    ? {
        OR: [
          { usernameNormalized: { contains: query.toLowerCase() } },
          { displayName: { contains: query, mode: "insensitive" as const } },
          { user: { email: { contains: query, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [
    userCount,
    profileCount,
    playlistCount,
    connectionCount,
    signupsThisWeek,
    suspendedCount,
    matching,
    profiles,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.profile.count(),
    prisma.playlist.count(),
    prisma.connectedAccount.count(),
    // The cutoff is computed by the database rather than from Date.now() here:
    // reading the clock during render is impure, and this also sidesteps any
    // skew between the app server's clock and the database's.
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "User"
      WHERE "createdAt" >= now() - interval '7 days'
    `.then((rows) => rows[0]?.n ?? 0),
    prisma.profile.count({ where: { suspendedAt: { not: null } } }),
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        userId: true,
        username: true,
        usernameNormalized: true,
        displayName: true,
        isPublic: true,
        suspendedAt: true,
        suspendedReason: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
  ]);

  // Playlists and connections hang off User rather than Profile, so their counts
  // need a separate pass. Scoped to the userIds on this page so the query stays
  // bounded no matter how large the tables get.
  const pageUserIds = profiles.map((profile) => profile.userId);
  const [playlistCounts, connectionCounts] = await Promise.all([
    prisma.playlist.groupBy({
      by: ["userId"],
      where: { userId: { in: pageUserIds } },
      _count: { _all: true },
    }),
    prisma.connectedAccount.groupBy({
      by: ["userId"],
      where: { userId: { in: pageUserIds } },
      _count: { _all: true },
    }),
  ]);

  const playlistByUser = new Map(
    playlistCounts.map((row) => [row.userId, row._count._all])
  );
  const connectionByUser = new Map(
    connectionCounts.map((row) => [row.userId, row._count._all])
  );

  const rows: AdminProfile[] = profiles.map((profile) => ({
    id: profile.id,
    username: profile.username,
    usernameNormalized: profile.usernameNormalized,
    displayName: profile.displayName,
    email: profile.user.email,
    isPublic: profile.isPublic,
    suspendedAt: profile.suspendedAt?.toISOString() ?? null,
    suspendedReason: profile.suspendedReason,
    playlistCount: playlistByUser.get(profile.userId) ?? 0,
    connectionCount: connectionByUser.get(profile.userId) ?? 0,
    createdAt: profile.createdAt.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(matching / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="serif text-3xl">Admin</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Moderation and site overview.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-ink-faint transition-colors hover:text-ink"
        >
          Back to dashboard
        </Link>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Users" value={userCount} />
        <Stat label="Profiles" value={profileCount} />
        <Stat label="Playlists" value={playlistCount} />
        <Stat label="Connections" value={connectionCount} />
        <Stat label="New this week" value={signupsThisWeek} />
        <Stat label="Suspended" value={suspendedCount} tone={suspendedCount > 0 ? "warn" : undefined} />
      </section>

      <form className="mt-8 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search username, name or email"
          className="field"
        />
        <button
          type="submit"
          className="btn-ghost"
        >
          Search
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-faint">
        {matching} profile{matching === 1 ? "" : "s"}
        {query ? ` matching "${query}"` : ""}
      </p>

      <ul className="mt-3 space-y-3">
        {rows.map((profile) => (
          <ProfileRow key={profile.id} profile={profile} />
        ))}
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-6 py-10 text-center text-sm text-ink-faint">
            No profiles found.
          </li>
        )}
      </ul>

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          <PageLink page={page - 1} query={query} disabled={page <= 1}>
            &larr; Previous
          </PageLink>
          <span className="text-ink-faint">
            Page {page} of {totalPages}
          </span>
          <PageLink page={page + 1} query={query} disabled={page >= totalPages}>
            Next &rarr;
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn";
}) {
  return (
    <div className="panel px-4 py-3">
      <p className="text-xs text-ink-dim">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          tone === "warn" ? "text-[var(--warn)]" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PageLink({
  page,
  query,
  disabled,
  children,
}: {
  page: number;
  query: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-ink-faint opacity-50">{children}</span>;
  }
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("page", String(page));
  return (
    <Link
      href={`/admin?${params}`}
      className="text-ink-dim transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
}
