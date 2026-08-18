import Link from "next/link";

import { displayUrl } from "@/lib/app-url";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

import { WelcomeMoment } from "./welcome-moment";

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const { profile } = await requireProfile();

  const searchParams = await props.searchParams;
  const rawWelcome = searchParams.welcome;
  const isNew =
    (Array.isArray(rawWelcome) ? rawWelcome[0] : rawWelcome) === "1";

  const [connectionCount, playlistCount, visibleCount] = await Promise.all([
    prisma.connectedAccount.count({ where: { userId: profile.userId } }),
    prisma.playlist.count({ where: { userId: profile.userId } }),
    prisma.playlist.count({ where: { userId: profile.userId, visible: true } }),
  ]);

  const publicUrl = displayUrl(`/${profile.usernameNormalized}`);
  const name = profile.displayName || profile.username;

  return (
    <>
      {isNew && <WelcomeMoment displayName={name} handle={profile.username} />}

      {/* Each block enters a beat after the one above it. Small enough to read
          as the page settling rather than as an effect, and `both` on the
          keyframe holds each one hidden through its delay instead of letting it
          flash in first. */}
      <div className="space-y-10">
        <section className="rise">
          <h1 className="heading text-3xl">
            {/* "Welcome back" is wrong for someone who has never been here. */}
            {isNew ? "Welcome" : "Welcome back"}
            {name ? `, ${name}` : ""}
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
          <Stat label="Connected services" value={connectionCount} delay={60} />
          <Stat label="Playlists imported" value={playlistCount} delay={120} />
          <Stat label="Shown on your page" value={visibleCount} delay={180} />
        </section>

        {connectionCount === 0 && (
          <section
            className="rise rounded-xl border border-dashed border-[var(--line)] px-6 py-10 text-center"
            style={{ animationDelay: "260ms" }}
          >
            <h2 className="heading text-xl">Connect a music service</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-dim">
              Link Spotify or YouTube to import your playlists and start building
              your page.
            </p>
            <Link href="/dashboard/connections" className="btn-gold mt-6">
              Connect a service
            </Link>
          </section>
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <div className="panel rise px-5 py-4" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-sm text-ink-dim">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
