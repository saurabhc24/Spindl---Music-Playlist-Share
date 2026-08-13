import { ProviderIcon, providerLabel } from "@/components/provider-badge";
import { requireProfile } from "@/lib/dal";
import {
  isProviderConfigured,
  providerSlug,
  type ConnectableProvider,
} from "@/lib/providers";
import { prisma } from "@/lib/prisma";
import { syncFailureHint } from "@/lib/sync-status";

import { ConnectionActions } from "./connection-actions";

// Only the providers that can actually be connected. Everything else is
// link-only and belongs on the Playlists page, since there is nothing to
// authorize.
const PROVIDER_ORDER: ConnectableProvider[] = ["SPOTIFY", "YOUTUBE"];

const PROVIDER_BLURBS: Record<ConnectableProvider, string> = {
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
  // The account linked fine; only the first playlist read failed. Saying
  // "couldn't connect" here would send the user off to reconnect something that
  // is already connected, which no amount of retrying can fix.
  import_failed:
    "Connected, but we couldn't import your playlists yet — see the reason below.",
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
        <h1 className="heading text-3xl">Connections</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Link a music service to import your playlists. We only ever read them.
        </p>
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="note note-error"
        >
          {errorMessage}
        </p>
      )}

      {connectedSlug && !errorMessage && (
        <p className="note note-ok">
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
              className="panel flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="flex items-start gap-4">
                <ProviderIcon provider={provider} className="mt-0.5 h-6 w-6" />
                <div>
                  <p className="font-medium">{providerLabel(provider)}</p>
                  <p className="mt-1 max-w-md text-sm text-ink-dim">
                    {PROVIDER_BLURBS[provider]}
                  </p>

                  {connection && (
                    <p className="mt-2 text-xs text-ink-faint">
                      {count} playlist{count === 1 ? "" : "s"} imported
                      {connection.lastSyncedAt && (
                        <> &middot; last synced {formatRelative(connection.lastSyncedAt)}</>
                      )}
                    </p>
                  )}

                  {connection?.lastSyncStatus?.startsWith("error") && (
                    <p className="mt-2 max-w-md text-xs text-[var(--warn)]">
                      {syncFailureHint(connection.lastSyncStatus)}
                    </p>
                  )}

                  {!configured && !connection && (
                    <p className="mt-2 text-xs text-[var(--warn)]">
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
