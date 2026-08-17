import { HalftoneField } from "@/app/halftone-field";

/**
 * The backdrop every auth screen sits on: the landing page's ribbon, behind the
 * same veil the sign-in card puts over it.
 *
 * A layout rather than a wrapper each page renders, because there are three of
 * them -- sign in, check your email, pick a username -- and they are one journey
 * with a single background. Copied into each page it would be three chances to
 * drift, and it already had: the username page had the treatment while the two
 * login screens were still on the bare scene gradient, which is what made
 * signing out land somewhere that looked like a different product.
 *
 * `data-shelf-scene` is what the reduced-motion rule keys on, so the ribbon's
 * drift and shimmer stop here exactly as they do on the landing page.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-shelf-scene
      className="relative flex flex-1 flex-col overflow-hidden"
    >
      <HalftoneField />
      {/* Over the ribbon, under the page. backdrop-filter blurs what is already
          painted beneath it, which is why it sits between the two. */}
      <div
        aria-hidden="true"
        className="veil pointer-events-none absolute inset-0"
      />

      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
