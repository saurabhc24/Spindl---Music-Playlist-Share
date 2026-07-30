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
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{profile.displayName ? `, ${profile.displayName}` : ""}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
        <section className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <h2 className="text-lg font-medium">Connect a music service</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
            Link Spotify or YouTube to import your playlists and start building
            your page.
          </p>
          <Link
            href="/dashboard/connections"
            className="mt-6 inline-block rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
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
    <div className="rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
