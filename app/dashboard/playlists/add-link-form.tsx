"use client";

import { useActionState, useRef, useState } from "react";

import { parsePlaylistLink } from "@/lib/playlist-link";

import { addPlaylistLink, type AddLinkState } from "./actions";

export function AddLinkForm() {
  const [state, action, pending] = useActionState<AddLinkState, FormData>(
    addPlaylistLink,
    undefined
  );
  const [value, setValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // The same parser the server uses, so an unrecognised link is called out
  // before a round-trip. It is only feedback -- the server re-parses regardless.
  const trimmed = value.trim();
  const parsed = trimmed ? parsePlaylistLink(trimmed) : null;
  const looksInvalid = trimmed.length > 8 && !parsed;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        // Clearing on submit would lose the text if the add failed, so it is
        // cleared here and only when the input is genuinely a playlist link.
        if (parsed) setValue("");
      }}
      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <label htmlFor="url" className="block text-sm font-medium">
        Add a playlist by link
      </label>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Paste any public Spotify or YouTube playlist URL. No account connection
        needed.
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
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
        />
        <button
          type="submit"
          disabled={pending || !parsed}
          className="shrink-0 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-200"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </div>

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
            ? "That doesn't look like a Spotify or YouTube playlist link."
            : parsed
              ? `Looks like a ${parsed.provider === "SPOTIFY" ? "Spotify" : "YouTube"} playlist.`
              : (state?.success ?? ""))}
      </p>
    </form>
  );
}
