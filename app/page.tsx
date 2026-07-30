import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
        Spindl
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Everything you&apos;ve got spinning
      </h1>
      <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
        Put your favourite Spotify and YouTube playlists on a shelf worth
        showing off, and share the whole thing with one link.
      </p>
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/login"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
        >
          Get started
        </Link>
      </div>
    </div>
  );
}
