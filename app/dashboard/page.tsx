import Link from "next/link";

import { displayUrl } from "@/lib/app-url";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { profile } = await requireProfile();

  const [connectionCount, playlistCount, visibleCount] = await Promise.all([
    prisma.connectedAccount.count({ where: { userId: profile.userId } }),
    prisma.playlist.count({ where: { userId: profile.userId } }),
    prisma.playlist.count({ where: { userId: profile.userId, visible: true } }),
  ]);

  const publicUrl = displayUrl(`/${profile.usernameNormalized}`);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="serif text-3xl">
          Welcome back{profile.displayName ? `, ${profile.displayName}` : ""}
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Your page is live at{" "}
          <Link
            href={`/${profile.username}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {publicUrl}
          </Link>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Connected services" value={connectionCount} />
        <Stat label="Playlists imported" value={playlistCount} />
        <Stat label="Shown on your page" value={visibleCount} />
      </section>

      {connectionCount === 0 && (
        <section className="rounded-xl border border-dashed border-[var(--line)] px-6 py-10 text-center">
          <h2 className="serif text-xl">Connect a music service</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-dim">
            Link Spotify or YouTube to import your playlists and start building
            your page.
          </p>
          <Link
            href="/dashboard/connections"
            className="btn-gold mt-6"
          >
            Connect a service
          </Link>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel px-5 py-4">
      <p className="text-sm text-ink-dim">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
