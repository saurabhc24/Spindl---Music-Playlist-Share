import { Instrument_Serif, Manrope } from "next/font/google";

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
export const showcaseFonts = `${instrumentSerif.variable} ${manrope.variable}`;
