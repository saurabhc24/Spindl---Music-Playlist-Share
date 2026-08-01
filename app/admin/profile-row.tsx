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
    <li className="panel p-4">
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
              <span className="pill !py-0.5 !text-[10px] !text-[var(--danger)]">
                Suspended
              </span>
            )}
            {!profile.isPublic && !suspended && (
              <span className="pill !py-0.5 !text-[10px]">
                Private
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-ink-dim">
            {profile.displayName ?? "(no display name)"} &middot; {profile.email ?? "no email"}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {profile.playlistCount} playlists &middot; {profile.connectionCount}{" "}
            connections &middot; joined{" "}
            {new Date(profile.createdAt).toLocaleDateString()}
          </p>
          {profile.suspendedReason && (
            <p className="mt-1 text-xs text-[var(--danger)]">
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
                className="field !w-40 !px-3 !py-1.5 !text-xs"
              />
            )}
            <button
              type="submit"
              disabled={suspendPending}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                suspended
                  ? "border border-[var(--line)]   "
                  : "btn-danger"
              }`}
            >
              {suspendPending ? "..." : suspended ? "Restore" : "Suspend"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setConfirmingDelete((open) => !open)}
            className="rounded-lg px-2 py-1.5 text-xs text-ink-faint transition-colors hover:text-[var(--danger)]"
          >
            Delete
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <form
          action={deleteAction}
          className="note note-error mt-3 !p-3"
        >
          <input type="hidden" name="profileId" value={profile.id} />
          <p className="text-xs text-[var(--danger)]">
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
              className="field flex-1 !px-3 !py-1.5 !text-xs"
            />
            <button
              type="submit"
              disabled={deletePending}
              className="btn-danger"
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
              ? "text-[var(--danger)]"
              : "text-[var(--ok)]"
          }`}
        >
          {message.error ?? message.success}
        </p>
      )}
    </li>
  );
}
