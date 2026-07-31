import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Returning users look top-right for sign-in, so the link lives there
          rather than competing with the hero's call to action. It points at
          /login unconditionally: that page redirects an existing session
          straight to /dashboard, which means this page never has to read the
          session and can stay statically prerendered. */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <span className="font-semibold tracking-tight">Spindl</span>
        <Link
          href="/login"
          className="text-sm text-zinc-600 transition-colors hover:text-foreground dark:text-zinc-400"
        >
          Sign in
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Everything you&apos;ve got spinning
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Put your favourite Spotify and YouTube playlists on a shelf worth
          showing off, and share the whole thing with one link.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
          >
            Get started
          </Link>
        </div>
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
