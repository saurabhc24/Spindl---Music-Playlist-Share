"use client";

import { useActionState, useState } from "react";

import { changeUsername, updateProfile, type ActionState } from "./actions";

function Feedback({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`text-sm ${
        state.error
          ? "text-red-600 dark:text-red-400"
          : "text-green-600 dark:text-green-400"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300";

export function ProfileForm({
  displayName,
  bio,
  isPublic,
}: {
  displayName: string;
  bio: string;
  isPublic: boolean;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateProfile,
    undefined
  );
  const [bioValue, setBioValue] = useState(bio);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          maxLength={50}
          placeholder="Your name"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-medium">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={280}
          value={bioValue}
          onChange={(event) => setBioValue(event.target.value)}
          placeholder="What are people listening to here?"
          className={`${inputClass} resize-y`}
        />
        <p className="mt-1 text-right text-xs text-zinc-400">
          {bioValue.length}/280
        </p>
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={isPublic}
          className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        <span className="text-sm">
          <span className="font-medium">Public page</span>
          <span className="block text-zinc-600 dark:text-zinc-400">
            When off, your page returns &ldquo;not found&rdquo; to visitors.
          </span>
        </span>
      </label>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}

export function UsernameSection({
  username,
  appUrl,
}: {
  username: string;
  appUrl: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    changeUsername,
    undefined
  );

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
        Username
      </label>
      <div className="flex items-center rounded-lg border border-zinc-300 focus-within:border-zinc-900 dark:border-zinc-700 dark:focus-within:border-zinc-300">
        <span className="select-none py-2.5 pl-4 text-sm text-zinc-400">
          {appUrl}/
        </span>
        <input
          id="username"
          name="username"
          defaultValue={username}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full bg-transparent py-2.5 pr-4 text-sm outline-none"
        />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Your old link keeps working &mdash; it redirects here automatically.
      </p>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {pending ? "Updating..." : "Change username"}
      </button>
    </form>
  );
}
