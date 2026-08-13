import Link from "next/link";

import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

import { AddLinkForm } from "./add-link-form";
import { PlaylistManager } from "./playlist-manager";

export default async function PlaylistsPage() {
  const { user } = await requireProfile();

  const playlists = await prisma.playlist.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      provider: true,
      coverImageUrl: true,
      trackCount: true,
      visible: true,
      isStale: true,
      connectedAccountId: true,
    },
  });

  const rows = playlists.map(({ connectedAccountId, ...playlist }) => ({
    ...playlist,
    // A pasted link has no connected account behind it, which is also what
    // makes it removable rather than merely hideable.
    isManual: connectedAccountId === null,
  }));

  // PlaylistManager seeds its state from this list once, so it has to remount
  // when the *set* changes -- otherwise a newly added or removed playlist
  // wouldn't appear until a hard reload. Sorted, so reordering (which changes
  // order but not membership) doesn't needlessly discard the manager's state.
  const membershipKey = rows
    .map((row) => row.id)
    .sort()
    .join(",");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="heading text-3xl">Playlists</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Toggle which playlists appear on your public page, and drag to set the
          order they appear in.
        </p>
      </header>

      <AddLinkForm />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] px-6 py-12 text-center">
          <h2 className="heading text-xl">No playlists yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-dim">
            Paste a playlist link above, or connect Spotify or YouTube and
            we&apos;ll import your playlists here.
          </p>
          <Link
            href="/dashboard/connections"
            className="btn-gold mt-6"
          >
            Connect a service
          </Link>
        </div>
      ) : (
        <PlaylistManager key={membershipKey} initial={rows} />
      )}
    </div>
  );
}
