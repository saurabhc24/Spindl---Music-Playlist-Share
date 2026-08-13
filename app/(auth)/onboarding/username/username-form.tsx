"use client";

import { useActionState, useEffect, useState } from "react";

import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  validateUsername,
} from "@/lib/username";

import { claimUsername, type ClaimUsernameState } from "./actions";

// Long enough that typing a name end-to-end sends one request, not one per key.
const DEBOUNCE_MS = 450;

type RemoteResult = {
  /** Which normalized name this answer is about, so a stale reply is ignored. */
  normalized: string;
  status: "available" | "taken" | "error";
  message?: string;
};

export function UsernameForm() {
  const [state, action, pending] = useActionState<ClaimUsernameState, FormData>(
    claimUsername,
    undefined
  );
  const [value, setValue] = useState("");
  const [remote, setRemote] = useState<RemoteResult | null>(null);

  // Everything that can be known without the network is derived during render.
  // Keeping it out of state avoids a setState-in-effect cascade, and means the
  // validation message appears the moment a key is pressed rather than a render
  // later.
  const trimmed = value.trim();
  const validation = trimmed ? validateUsername(trimmed) : null;
  const normalized = validation?.ok ? validation.normalized : null;

  useEffect(() => {
    if (!normalized) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/username/available?u=${encodeURIComponent(normalized)}`,
          { signal: controller.signal }
        );

        if (response.status === 429) {
          setRemote({ normalized, status: "error" });
          return;
        }

        const data = await response.json();
        setRemote({
          normalized,
          status: data.available ? "available" : "taken",
          message: data.message,
        });
      } catch (error) {
        // An aborted request is the expected outcome of typing another key.
        if ((error as Error)?.name === "AbortError") return;
        setRemote({ normalized, status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalized]);

  // An answer only counts if it's for what's currently typed; otherwise we're
  // still waiting on the debounce or the request.
  const current = remote?.normalized === normalized ? remote : null;
  const hint = describe({ trimmed, validation, current });
  const isTaken = current?.status === "taken";

  return (
    <form action={action} className="mt-8 space-y-3">
      <label htmlFor="username" className="mb-1.5 block text-sm font-medium">
        Username
      </label>
      <input
        id="username"
        name="username"
        required
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        // Hard stop at the same limit the server enforces, so the field can't
        // accept characters that are only going to be rejected on submit.
        maxLength={USERNAME_MAX_LENGTH}
        // Not type="url" or inputMode="url": that keyboard leads with "/" and
        // ".com", neither of which is legal here.
        inputMode="text"
        placeholder="yourname"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-describedby="username-hint"
        aria-invalid={isTaken || validation?.ok === false || undefined}
        // Room above the field when a browser scrolls it into view for the
        // on-screen keyboard, so it doesn't end up flush against the top edge
        // with its label cropped off.
        className="field scroll-mt-24 !py-3"
      />

      <p
        id="username-hint"
        role="status"
        aria-live="polite"
        className={`min-h-5 text-sm ${hint.className}`}
      >
        {state?.error ?? hint.text}
      </p>

      <button
        type="submit"
        disabled={pending || isTaken}
        className="btn-gold w-full !py-3"
      >
        {pending ? "Claiming..." : "Claim my link"}
      </button>
    </form>
  );
}

function describe({
  trimmed,
  validation,
  current,
}: {
  trimmed: string;
  validation: ReturnType<typeof validateUsername> | null;
  current: RemoteResult | null;
}): { text: string; className: string } {
  const muted = "text-ink-faint";

  if (!trimmed || !validation) {
    return {
      text: `${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters. Letters, numbers, periods, hyphens and underscores.`,
      className: muted,
    };
  }

  if (!validation.ok) {
    return {
      text: validation.message,
      className: "text-[var(--warn)]",
    };
  }

  if (!current) {
    return { text: "Checking availability...", className: muted };
  }

  switch (current.status) {
    case "available":
      return {
        text: "That one's free.",
        className: "text-[var(--ok)]",
      };
    case "taken":
      return {
        text: current.message ?? "That username is taken.",
        className: "text-[var(--danger)]",
      };
    default:
      return {
        text: "Couldn't check right now -- you can still submit.",
        className: muted,
      };
  }
}
