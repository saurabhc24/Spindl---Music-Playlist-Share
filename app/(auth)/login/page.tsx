import Link from "next/link";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import {
  signIn,
  auth,
  isEmailLoginConfigured,
  isGoogleLoginConfigured,
} from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already registered with a different sign-in method. Use the method you signed up with.",
  EmailSignInError: "We couldn't send that email. Please try again.",
  Default: "Something went wrong signing you in. Please try again.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const searchParams = await props.searchParams;
  const rawError = searchParams.error;
  const errorKey = Array.isArray(rawError) ? rawError[0] : rawError;
  const errorMessage = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.Default)
    : null;

  const rawCallback = searchParams.callbackUrl;
  const callbackUrl = Array.isArray(rawCallback) ? rawCallback[0] : rawCallback;
  // Only allow same-origin relative paths, so a crafted ?callbackUrl= can't
  // bounce a freshly-authenticated user to an external site.
  const redirectTo =
    callbackUrl && /^\/(?!\/)/.test(callbackUrl) ? callbackUrl : "/dashboard";

  const googleEnabled = isGoogleLoginConfigured();
  const emailEnabled = isEmailLoginConfigured();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-foreground dark:text-zinc-400"
        >
          &larr; Back
        </Link>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Build your Spindl in under a minute.
        </p>

        {errorMessage && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {errorMessage}
          </p>
        )}

        {!googleEnabled && !emailEnabled && (
          <p className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            No sign-in method is configured yet. Set{" "}
            <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code> (or{" "}
            <code className="font-mono text-xs">AUTH_RESEND_KEY</code> for email
            links) in your environment, then redeploy.
          </p>
        )}

        {googleEnabled && (
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z"
              />
            </svg>
            Continue with Google
          </button>
        </form>
        )}

        {googleEnabled && emailEnabled && (
          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-xs uppercase tracking-wide text-zinc-400">
              or
            </span>
            <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
        )}

        {emailEnabled && (
        <form
          action={async (formData: FormData) => {
            "use server";
            try {
              await signIn("resend", {
                email: formData.get("email"),
                redirectTo,
              });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(`/login?error=EmailSignInError`);
              }
              throw error;
            }
          }}
          className="space-y-3"
        >
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 dark:border-zinc-700 dark:focus:border-zinc-300"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
          >
            Email me a sign-in link
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
