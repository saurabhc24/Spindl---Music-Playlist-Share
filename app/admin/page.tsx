import Link from "next/link";

import { requireAdmin } from "@/lib/admin";
import { getAdminMetrics } from "@/lib/admin-metrics";
import { prisma } from "@/lib/prisma";

import { MetricGrid } from "./metric-grid";
import { ProfileRow, type AdminProfile } from "./profile-row";

// Always live: an admin acting on stale moderation data is worse than a slow page.
export const dynamic = "force-dynamic";

/**
 * Deliberately small. Nobody moderates by scrolling -- they arrive knowing which
 * account they want and search for it -- so a long first page costs render time
 * and a wall of rows to find nothing faster. Each page is a bounded skip/take, so
 * this is the number of rows fetched, not just the number shown.
 */
const PAGE_SIZE = 10;

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
    metrics,
    profileCount,
    playlistCount,
    connectionCount,
    matching,
    profiles,
  ] = await Promise.all([
    getAdminMetrics(),
    prisma.profile.count(),
    prisma.playlist.count(),
    prisma.connectedAccount.count(),
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
        user: {
          select: { email: true, deletedEmail: true, deletedAt: true },
        },
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
    // A deleted account has no `email` -- it was moved aside to free the unique
    // index. Falling back keeps the admin list able to say who this was.
    email: profile.user.email ?? profile.user.deletedEmail,
    isPublic: profile.isPublic,
    deletedAt: profile.user.deletedAt?.toISOString() ?? null,
    suspendedAt: profile.suspendedAt?.toISOString() ?? null,
    suspendedReason: profile.suspendedReason,
    playlistCount: playlistByUser.get(profile.userId) ?? 0,
    connectionCount: connectionByUser.get(profile.userId) ?? 0,
    createdAt: profile.createdAt.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(matching / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Wraps rather than staying on one line: at 360px "Back to dashboard"
          and the title share about 300px between them and the link ends up
          against the screen edge. */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="heading text-3xl">Admin</h1>
        <Link
          href="/dashboard"
          className="text-xs text-ink-faint transition-colors hover:text-ink sm:text-sm"
        >
          Back to dashboard
        </Link>
        <p className="w-full text-sm text-ink-dim">
          Moderation and site overview.
        </p>
      </header>

      <MetricGrid
        metrics={metrics}
        profileCount={profileCount}
        playlistCount={playlistCount}
        connectionCount={connectionCount}
      />

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

      {/* The range, not just the total: with ten to a page the useful question
          is which ten these are. */}
      <p className="mt-5 text-sm text-ink-faint">
        {matching === 0
          ? "No profiles"
          : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, matching)} of ${matching}`}
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
