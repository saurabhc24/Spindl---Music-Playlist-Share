"use client";

import { useActionState, useState } from "react";

import { parsePlaylistLink } from "@/lib/playlist-link";

import { addPlaylistLink, type AddLinkState } from "./actions";

const PROVIDER_NAMES: Record<string, string> = {
  SPOTIFY: "Spotify",
  YOUTUBE: "YouTube",
  OTHER: "that link",
};

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

  // Spotify and YouTube tell us the title; no other service does, so these
  // fields only appear when they are actually needed.
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
      className="panel p-4"
    >
      <label htmlFor="url" className="block text-sm font-medium">
        Add a playlist by link
      </label>
      <p className="mt-1 text-xs text-ink-faint">
        Paste a public Spotify or YouTube playlist URL — or any other playlist
        link. No account connection needed.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="url"
          name="url"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://open.spotify.com/playlist/..."
          autoComplete="off"
          spellCheck={false}
          aria-invalid={looksInvalid || undefined}
          className="field"
        />
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="shrink-0 btn-gold"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </div>

      {needsTitle && (
        <div className="mt-3 space-y-2 rounded-lg border border-[var(--line)] bg-[oklch(0.14_0.01_66_/_0.5)] p-3">
          <p className="text-xs text-ink-dim">
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
            className="field"
          />
          <input
            name="coverImageUrl"
            value={cover}
            onChange={(event) => setCover(event.target.value)}
            placeholder="Cover image URL (optional, https://...)"
            autoComplete="off"
            spellCheck={false}
            className="field"
          />
        </div>
      )}

      <p
        role="status"
        aria-live="polite"
        className={`mt-2 min-h-4 text-xs ${
          state?.error || looksInvalid
            ? "text-[var(--danger)]"
            : state?.success
              ? "text-[var(--ok)]"
              : "text-ink-faint"
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
