import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="serif text-3xl">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-dim">
        There&apos;s no Spindl at this link. It may have been renamed or made
        private.
      </p>
      <Link
        href="/"
        className="btn-gold mt-8"
      >
        Make your own Spindl
      </Link>
    </div>
  );
}
