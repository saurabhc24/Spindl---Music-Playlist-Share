import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { showcaseFonts } from "@/app/fonts";

import { VisitBeacon } from "./visit-beacon";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Spindl",
    template: "%s | Spindl",
  },
  description:
    "Everything you've got spinning, on one shelf. Share your Spotify and YouTube playlists from a single link.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The showcase pair is applied here rather than per route now that every
    // screen uses it. Geist is gone -- nothing referenced it once the dashboard
    // moved into the same scene as the public page.
    <html lang="en" className={`${showcaseFonts} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        {/* Vercel's own count stays -- it is the one with bot filtering and a
            dashboard. This is the same number in our database, so the admin page
            doesn't depend on a third party being up or on a plan tier. */}
        <VisitBeacon />
        <Analytics />
      </body>
    </html>
  );
}
