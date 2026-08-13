import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { SignInOptions, safeRedirectTo } from "@/components/sign-in-options";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already registered with a different sign-in method. Use the method you signed up with.",
  EmailSignInError: "We couldn't send that email. Please try again.",
  Default: "Something went wrong signing you in. Please try again.",
};

/**
 * The full-page sign-in.
 *
 * Still here now that the landing page opens a card instead of navigating, and
 * not merely as a fallback: the proxy sends every unauthenticated dashboard
 * request here with a callbackUrl, Auth.js sends its own errors here, and the
 * card cannot show an ?error= it never receives. The card is the shortcut; this
 * is the address.
 */
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
  const redirectTo = safeRedirectTo(callbackUrl);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-sm text-ink-faint transition-colors hover:text-ink"
        >
          &larr; Back
        </Link>

        <h1 className="heading mt-6 text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Build your Spindl in under a minute.
        </p>

        {errorMessage && (
          <p role="alert" className="mt-6 note note-error">
            {errorMessage}
          </p>
        )}

        <div className="mt-8">
          <SignInOptions redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  );
}
