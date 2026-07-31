"use client";

import { useActionState, useState } from "react";

import { parsePlaylistLink } from "@/lib/playlist-link";

import { addPlaylistLink, type AddLinkState } from "./actions";

const PROVIDER_NAMES: Record<string, string> = {
  SPOTIFY: "Spotify",
  YOUTUBE: "YouTube",
  AMAZON: "Amazon Music",
  OTHER: "that link",
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300";

export function AddLinkForm() {
  const [state, action, pending] = useActionState<AddLinkState, FormData>(
    addPlaylistLink,
    undefined
  );
  const [value, setValue] = useState("");
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");

  // The same parser the server uses, so the form knows what a link is before a
  // round-trip. It is only feedback -- the server re-parses regardless.
  const trimmed = value.trim();
  const parsed = trimmed ? parsePlaylistLink(trimmed) : null;
  const looksInvalid = trimmed.length > 8 && !parsed;

  // Spotify and YouTube tell us the title; Amazon and everything else cannot,
  // so the fields only appear when they are actually needed.
  const needsTitle = parsed?.needsManualTitle ?? false;
  const canSubmit = Boolean(parsed) && (!needsTitle || title.trim().length > 0);

  function reset() {
    setValue("");
    setTitle("");
    setCover("");
  }

  return (
    <form
      action={async (formData) => {
        await action(formData);
        if (parsed) reset();
      }}
      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <label htmlFor="url" className="block text-sm font-medium">
        Add a playlist by link
      </label>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Paste a public Spotify, YouTube or Amazon Music playlist URL — or any
        other playlist link. No account connection needed.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="url"
          name="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://music.amazon.com/playlists/..."
          autoComplete="off"
          spellCheck={false}
          aria-invalid={looksInvalid || undefined}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="shrink-0 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-200"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </div>

      {needsTitle && (
        <div className="mt-3 space-y-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {PROVIDER_NAMES[parsed!.provider] ?? "That service"} doesn&apos;t
            publish playlist details, so name it yourself.
          </p>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Playlist name"
            maxLength={200}
            autoComplete="off"
            className={inputClass}
          />
          <input
            name="coverImageUrl"
            value={cover}
            onChange={(event) => setCover(event.target.value)}
            placeholder="Cover image URL (optional, https://...)"
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
          />
        </div>
      )}

      <p
        role="status"
        aria-live="polite"
        className={`mt-2 min-h-4 text-xs ${
          state?.error || looksInvalid
            ? "text-red-600 dark:text-red-400"
            : state?.success
              ? "text-green-600 dark:text-green-400"
              : "text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {state?.error ??
          (looksInvalid
            ? "That doesn't look like a playlist link."
            : parsed
              ? `Looks like a ${PROVIDER_NAMES[parsed.provider] ?? "playlist"} link.`
              : (state?.success ?? ""))}
      </p>
    </form>
  );
}
