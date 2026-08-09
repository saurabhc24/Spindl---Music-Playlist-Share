"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  deleteAccount,
  restoreAccount,
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
  deletedAt: string | null;
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
  const [restoreState, restoreAction, restorePending] = useActionState<
    AdminActionState,
    FormData
  >(restoreAccount, undefined);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const suspended = Boolean(profile.suspendedAt);
  const deleted = Boolean(profile.deletedAt);
  const message = suspendState ?? deleteState ?? restoreState;

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
            {deleted && (
              <span className="pill !py-0.5 !text-[10px] !text-[var(--danger)]">
                Deleted
              </span>
            )}
            {suspended && !deleted && (
              <span className="pill !py-0.5 !text-[10px] !text-[var(--danger)]">
                Suspended
              </span>
            )}
            {!profile.isPublic && !suspended && !deleted && (
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

        {/* A deleted account offers one action. Suspending or re-deleting it is
            meaningless while it is already invisible and signed out, and leaving
            those buttons live would only invite a confusing no-op. */}
        <div className="flex shrink-0 items-center gap-2">
          {deleted ? (
            <form action={restoreAction}>
              <input type="hidden" name="profileId" value={profile.id} />
              <button
                type="submit"
                disabled={restorePending}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {restorePending ? "..." : "Restore account"}
              </button>
            </form>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {confirmingDelete && !deleted && (
        <form
          action={deleteAction}
          className="note note-error mt-3 !p-3"
        >
          <input type="hidden" name="profileId" value={profile.id} />
          <p className="text-xs text-[var(--danger)]">
            Signs the account out, takes its page down and frees its email
            address. Playlists and connections are kept, and this can be undone
            from here. Type{" "}
            <span className="font-mono font-medium">
              {profile.usernameNormalized}
            </span>{" "}
            to confirm.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              name="confirmUsername"
              autoComplete="off"
              placeholder="Username"
              className="field flex-1 !px-3 !py-1.5 !text-xs"
            />
            <input
              name="reason"
              placeholder="Reason (optional)"
              maxLength={280}
              className="field !w-40 !px-3 !py-1.5 !text-xs"
            />
            <button
              type="submit"
              disabled={deletePending}
              className="btn-danger"
            >
              {deletePending ? "Deleting..." : "Delete account"}
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
