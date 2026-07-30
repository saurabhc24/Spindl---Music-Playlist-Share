"use client";

import { useActionState } from "react";

import { claimUsername, type ClaimUsernameState } from "./actions";

export function UsernameForm({ appUrl }: { appUrl: string }) {
  const [state, action, pending] = useActionState<ClaimUsernameState, FormData>(
    claimUsername,
    undefined
  );

  return (
    <form action={action} className="mt-8 space-y-3">
      <label htmlFor="username" className="sr-only">
        Username
      </label>
      <div className="flex items-center rounded-lg border border-zinc-300 focus-within:border-zinc-900 dark:border-zinc-700 dark:focus-within:border-zinc-300">
        <span className="select-none py-3 pl-4 text-sm text-zinc-400">
          {appUrl}/
        </span>
        <input
          id="username"
          name="username"
          required
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="yourname"
          className="w-full bg-transparent py-3 pr-4 text-sm outline-none placeholder:text-zinc-400"
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-200"
      >
        {pending ? "Claiming..." : "Claim my link"}
      </button>
    </form>
  );
}
