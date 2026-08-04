import { Instrument_Serif, Manrope, Space_Grotesk } from "next/font/google";

/**
 * The display face, for the landing page headline and wordmark.
 *
 * The design specifies NaN Jaune, which is a grotesque -- not the serif this
 * previously borrowed from the showcase, which was the wrong category entirely.
 * NaN Jaune ships only under a trial licence here, and trial licences do not
 * cover production or webfont embedding, so the files cannot be served from this
 * repo. Space Grotesk is the closest face that can be: a proportional grotesque
 * with the same geometric, slightly mechanical build.
 *
 * `.display` in globals.css names NaN Jaune ahead of this, so a machine with the
 * real font installed renders the design exactly while everyone else gets a face
 * of the same species. Naming a family in CSS distributes nothing.
 */
export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

/**
 * The showcase typeface pair, shared by the landing page and the public profile.
 *
 * Defined once rather than per route so the two can't drift apart, and kept out
 * of the root layout because the dashboard and admin areas use Geist -- there is
 * no reason for a signed-in user to download fonts they never see.
 */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/** Applied to the wrapper element of any route using the showcase look. */
export const showcaseFonts = `${instrumentSerif.variable} ${manrope.variable} ${spaceGrotesk.variable}`;
