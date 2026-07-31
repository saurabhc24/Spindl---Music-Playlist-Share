"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  deleteAccount,
  suspendProfile,
  unsuspendProfile,
  type AdminActionState,
} from "./actions";

export type AdminProfile = {
  id: string;
  username: string;
  usernameNormalized: string;
  displayName: string | null;
  email: string | null;
  isPublic: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  playlistCount: number;
  connectionCount: number;
  createdAt: string;
};

export function ProfileRow({ profile }: { profile: AdminProfile }) {
  const [suspendState, suspendAction, suspendPending] = useActionState<
    AdminActionState,
    FormData
  >(profile.suspendedAt ? unsuspendProfile : suspendProfile, undefined);
  const [deleteState, deleteAction, deletePending] = useActionState<
    AdminActionState,
    FormData
  >(deleteAccount, undefined);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const suspended = Boolean(profile.suspendedAt);
  const message = suspendState ?? deleteState;

  return (
    <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${profile.usernameNormalized}`}
              className="font-medium underline underline-offset-4"
            >
              /{profile.usernameNormalized}
            </Link>
            {suspended && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
                Suspended
              </span>
            )}
            {!profile.isPublic && !suspended && (
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Private
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
            {profile.displayName ?? "(no display name)"} &middot; {profile.email ?? "no email"}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {profile.playlistCount} playlists &middot; {profile.connectionCount}{" "}
            connections &middot; joined{" "}
            {new Date(profile.createdAt).toLocaleDateString()}
          </p>
          {profile.suspendedReason && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              Reason: {profile.suspendedReason}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <form action={suspendAction} className="flex items-center gap-2">
            <input type="hidden" name="profileId" value={profile.id} />
            {!suspended && (
              <input
                name="reason"
                placeholder="Reason (optional)"
                maxLength={280}
                className="w-40 rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 text-xs outline-none dark:border-zinc-700"
              />
            )}
            <button
              type="submit"
              disabled={suspendPending}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                suspended
                  ? "border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              {suspendPending ? "..." : suspended ? "Restore" : "Suspend"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setConfirmingDelete((open) => !open)}
            className="rounded-lg px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <form
          action={deleteAction}
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30"
        >
          <input type="hidden" name="profileId" value={profile.id} />
          <p className="text-xs text-red-700 dark:text-red-300">
            Permanently deletes the account, its playlists and connections. Type{" "}
            <span className="font-mono font-medium">
              {profile.usernameNormalized}
            </span>{" "}
            to confirm.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              name="confirmUsername"
              autoComplete="off"
              className="flex-1 rounded-lg border border-red-300 bg-transparent px-3 py-1.5 text-xs outline-none dark:border-red-900"
            />
            <button
              type="submit"
              disabled={deletePending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {deletePending ? "Deleting..." : "Delete forever"}
            </button>
          </div>
        </form>
      )}

      {(message?.error || message?.success) && (
        <p
          role="status"
          className={`mt-2 text-xs ${
            message.error
              ? "text-red-600 dark:text-red-400"
              : "text-green-600 dark:text-green-400"
          }`}
        >
          {message.error ?? message.success}
        </p>
      )}
    </li>
  );
}
