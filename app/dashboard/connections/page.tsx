import type { MusicProvider } from "@/app/generated/prisma/enums";
import { ProviderIcon, providerLabel } from "@/components/provider-badge";
import { requireProfile } from "@/lib/dal";
import { isProviderConfigured, providerSlug } from "@/lib/providers";
import { prisma } from "@/lib/prisma";

import { ConnectionActions } from "./connection-actions";

const PROVIDER_ORDER: MusicProvider[] = ["SPOTIFY", "YOUTUBE"];

const PROVIDER_BLURBS: Record<MusicProvider, string> = {
  SPOTIFY: "Import the playlists you've created and follow on Spotify.",
  // Deliberately says "YouTube", not "YouTube Music" -- there's no official
  // YouTube Music API, though YT Music playlists do surface through this one.
  YOUTUBE: "Import your YouTube playlists, including ones made in YouTube Music.",
};

const ERROR_MESSAGES: Record<string, string> = {
  denied: "You cancelled the connection. Nothing was changed.",
  invalid_state: "That connection link expired. Please try again.",
  missing_code: "The service didn't return an authorization code. Try again.",
  exchange_failed: "We couldn't complete the connection. Please try again.",
  not_configured:
    "This service isn't configured yet. Add its API credentials to your environment.",
};

export default async function ConnectionsPage(
  props: PageProps<"/dashboard/connections">
) {
  const { user } = await requireProfile();
  const searchParams = await props.searchParams;

  const rawError = searchParams.error;
  const errorKey = Array.isArray(rawError) ? rawError[0] : rawError;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : null;

  const rawConnected = searchParams.connected;
  const connectedSlug = Array.isArray(rawConnected)
    ? rawConnected[0]
    : rawConnected;

  const connections = await prisma.connectedAccount.findMany({
    where: { userId: user.id },
  });
  const byProvider = new Map(connections.map((row) => [row.provider, row]));

  const counts = await prisma.playlist.groupBy({
    by: ["provider"],
    where: { userId: user.id },
    _count: { _all: true },
  });
  const countByProvider = new Map(
    counts.map((row) => [row.provider, row._count._all])
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Link a music service to import your playlists. We only ever read them.
        </p>
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {errorMessage}
        </p>
      )}

      {connectedSlug && !errorMessage && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300">
          Connected. Head to{" "}
          <span className="font-medium">Playlists</span> to choose which ones
          appear on your page.
        </p>
      )}

      <ul className="space-y-4">
        {PROVIDER_ORDER.map((provider) => {
          const connection = byProvider.get(provider);
          const slug = providerSlug(provider);
          const configured = isProviderConfigured(provider);
          const count = countByProvider.get(provider) ?? 0;

          return (
            <li
              key={provider}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <div className="flex items-start gap-4">
                <ProviderIcon provider={provider} className="mt-0.5 h-6 w-6" />
                <div>
                  <p className="font-medium">{providerLabel(provider)}</p>
                  <p className="mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                    {PROVIDER_BLURBS[provider]}
                  </p>

                  {connection && (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {count} playlist{count === 1 ? "" : "s"} imported
                      {connection.lastSyncedAt && (
                        <> &middot; last synced {formatRelative(connection.lastSyncedAt)}</>
                      )}
                    </p>
                  )}

                  {connection?.lastSyncStatus?.startsWith("error") && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Last sync failed. Try syncing again, or reconnect the
                      account.
                    </p>
                  )}

                  {!configured && !connection && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Not configured yet &mdash; add this service&apos;s API
                      credentials to your environment.
                    </p>
                  )}
                </div>
              </div>

              <ConnectionActions slug={slug} connected={Boolean(connection)} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatRelative(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
