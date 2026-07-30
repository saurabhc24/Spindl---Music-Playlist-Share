import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
        There&apos;s no Spindl at this link. It may have been renamed or made
        private.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-zinc-700 dark:hover:bg-zinc-200"
      >
        Make your own Spindl
      </Link>
    </div>
  );
}
