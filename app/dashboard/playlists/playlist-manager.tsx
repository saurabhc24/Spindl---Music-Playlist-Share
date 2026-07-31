"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { MusicProvider } from "@/app/generated/prisma/enums";
import { ProviderIcon, providerLabel } from "@/components/provider-badge";

import { removePlaylistLink } from "./actions";

export type PlaylistRow = {
  id: string;
  title: string;
  provider: MusicProvider;
  coverImageUrl: string | null;
  trackCount: number | null;
  visible: boolean;
  isStale: boolean;
  /** Added by pasting a link rather than imported from a connected account. */
  isManual: boolean;
};

const WRITE_DEBOUNCE_MS = 400;

export function PlaylistManager({ initial }: { initial: PlaylistRow[] }) {
  const [playlists, setPlaylists] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const pendingWrites = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Flush nothing on unmount, but don't leave timers running either.
  useEffect(() => {
    const timers = pendingWrites.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = playlists.findIndex((row) => row.id === active.id);
    const newIndex = playlists.findIndex((row) => row.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = playlists;
    const reordered = arrayMove(playlists, oldIndex, newIndex);
    setPlaylists(reordered);
    setError(null);

    try {
      const response = await fetch("/api/playlists/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((row) => row.id) }),
      });
      if (!response.ok) throw new Error();
    } catch {
      // Roll back so the UI never claims an order the server didn't accept.
      setPlaylists(previous);
      setError("Couldn't save the new order. Please try again.");
    }
  }

  async function toggleVisibility(id: string, visible: boolean) {
    const previous = playlists;
    setPlaylists((rows) =>
      rows.map((row) => (row.id === id ? { ...row, visible } : row))
    );
    setError(null);

    // The switch flips instantly, but the write is debounced: flicking a toggle
    // back and forth (or racing through a long list) collapses into one request
    // per playlist instead of one per click.
    const existing = pendingWrites.current.get(id);
    if (existing) clearTimeout(existing);

    pendingWrites.current.set(
      id,
      setTimeout(async () => {
        pendingWrites.current.delete(id);
        try {
          const response = await fetch(`/api/playlists/${id}/visibility`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visible }),
          });
          if (!response.ok) {
            const message =
              response.status === 429
                ? "You're making changes very quickly. Please wait a moment."
                : "Couldn't update that playlist. Please try again.";
            setPlaylists(previous);
            setError(message);
          }
        } catch {
          setPlaylists(previous);
          setError("Couldn't update that playlist. Please try again.");
        }
      }, WRITE_DEBOUNCE_MS)
    );
  }

  const visibleCount = playlists.filter((row) => row.visible).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {visibleCount} of {playlists.length} shown on your page
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={playlists.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2">
            {playlists.map((playlist) => (
              <SortableRow
                key={playlist.id}
                playlist={playlist}
                onToggle={toggleVisibility}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  playlist,
  onToggle,
}: {
  playlist: PlaylistRow;
  onToggle: (id: string, visible: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: playlist.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-background p-3 dark:border-zinc-800 ${
        isDragging ? "z-10 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${playlist.title}`}
        className="cursor-grab touch-none rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 active:cursor-grabbing dark:hover:text-zinc-300"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
        >
          <circle cx="9" cy="6" r="1.5" />
          <circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" />
          <circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      {playlist.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={playlist.coverImageUrl}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{playlist.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <ProviderIcon provider={playlist.provider} className="h-3 w-3" />
          {providerLabel(playlist.provider)}
          {playlist.trackCount !== null && (
            <>
              <span aria-hidden="true">&middot;</span>
              {playlist.trackCount} tracks
            </>
          )}
          {playlist.isManual && (
            <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Added by link
            </span>
          )}
          {playlist.isStale && (
            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              No longer available
            </span>
          )}
        </p>
      </div>

      {/* Imported playlists are curated by hiding them -- deleting one would
          only invite the next sync to import it again. A pasted link has no
          such source, so removing it is the only way off the page. */}
      {playlist.isManual && (
        <form action={removePlaylistLink}>
          <input type="hidden" name="playlistId" value={playlist.id} />
          <button
            type="submit"
            aria-label={`Remove ${playlist.title}`}
            title="Remove"
            className="shrink-0 rounded p-1.5 text-zinc-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </form>
      )}

      <label className="flex shrink-0 cursor-pointer items-center gap-2">
        <span className="sr-only">Show {playlist.title} on my page</span>
        <input
          type="checkbox"
          checked={playlist.visible}
          onChange={(event) => onToggle(playlist.id, event.target.checked)}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 rounded-full bg-zinc-200 transition-colors peer-checked:bg-green-600 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5 dark:bg-zinc-700" />
      </label>
    </li>
  );
}
