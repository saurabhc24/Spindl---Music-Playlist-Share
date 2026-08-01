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
          ? "text-[var(--danger)]"
          : "text-[var(--ok)]"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

const inputClass =
  "field";

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
        <p className="mt-1 text-right text-xs text-ink-faint">
          {bioValue.length}/280
        </p>
      </div>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={isPublic}
          className="mt-0.5 h-4 w-4 rounded border-[var(--line)]"
        />
        <span className="text-sm">
          <span className="font-medium">Public page</span>
          <span className="block text-ink-dim">
            When off, your page returns &ldquo;not found&rdquo; to visitors.
          </span>
        </span>
      </label>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="btn-gold"
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
      <div className="flex items-center rounded-lg border border-[var(--line)] bg-[oklch(0.14_0.01_66_/_0.7)] focus-within:border-[var(--accent)]">
        <span className="select-none py-2.5 pl-4 text-sm text-ink-faint">
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

      <p className="text-xs text-ink-faint">
        Your old link keeps working &mdash; it redirects here automatically.
      </p>

      <Feedback state={state} />

      <button
        type="submit"
        disabled={pending}
        className="btn-ghost"
      >
        {pending ? "Updating..." : "Change username"}
      </button>
    </form>
  );
}
