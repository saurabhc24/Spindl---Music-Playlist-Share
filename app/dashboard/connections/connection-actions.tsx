"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ConnectionActions({
  slug,
  connected,
}: {
  slug: string;
  connected: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function post(path: string, action: "sync" | "disconnect") {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(path, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(data.error ?? "Something went wrong.");
        return;
      }

      if (action === "sync") {
        const added = typeof data.added === "number" ? data.added : 0;
        setMessage(
          added > 0
            ? `Synced. ${added} new playlist${added === 1 ? "" : "s"} imported.`
            : `Synced. ${data.imported ?? 0} playlist${data.imported === 1 ? "" : "s"} up to date.`
        );
      }

      startTransition(() => router.refresh());
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!connected) {
    return (
      <a
        href={`/api/connect/${slug}`}
        className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
      >
        Connect
      </a>
    );
  }

  const disabled = busy !== null || isPending;

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => post(`/api/sync/${slug}`, "sync")}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {busy === "sync" ? "Syncing..." : "Sync now"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (
              confirm(
                "Disconnect this service? Its playlists will be removed from your page."
              )
            ) {
              post(`/api/connect/${slug}/disconnect`, "disconnect");
            }
          }}
          className="rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-red-400"
        >
          {busy === "disconnect" ? "Removing..." : "Disconnect"}
        </button>
      </div>
      {message && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{message}</p>
      )}
    </div>
  );
}
