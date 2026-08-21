import Link from "next/link";

/**
 * The reading layout for the privacy policy and terms.
 *
 * Plain and narrow on purpose: these exist to be read, and one of their readers
 * is a Google reviewer checking that the app discloses what it does with Google
 * user data. The scene's palette, none of its motion.
 *
 * Element styling lives here rather than in each document so the two cannot
 * drift, and so the pages themselves stay close to prose.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:px-8 sm:py-16">
      <Link
        href="/"
        className="text-sm text-ink-faint transition-colors hover:text-ink"
      >
        &larr; SpindlShare
      </Link>

      <article
        className="
          mt-8
          [&_h1]:heading [&_h1]:text-[34px] [&_h1]:font-bold [&_h1]:leading-tight
          [&_h2]:heading [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-medium
          [&_p]:mt-4 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-ink-dim
          [&_ul]:mt-4 [&_ul]:space-y-2 [&_ul]:pl-5
          [&_li]:list-disc [&_li]:text-[15px] [&_li]:leading-relaxed [&_li]:text-ink-dim
          [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4
          [&_strong]:font-medium [&_strong]:text-ink
          /* A scope URL is one 48-character word with nowhere to break. Left
             alone it does not overflow so much as force the whole layout
             viewport wider than the phone, which reads as the page being
             zoomed out rather than as a bug. */
          [&_code]:break-all [&_code]:text-[13px] [&_code]:text-ink
        "
      >
        {children}
      </article>
    </div>
  );
}
