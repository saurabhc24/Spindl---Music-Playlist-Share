import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--panel)] ">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h1 className="serif mt-6 text-3xl">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          We sent you a sign-in link. It expires in 24 hours.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm text-ink-faint transition-colors hover:text-ink"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </div>
  );
}
