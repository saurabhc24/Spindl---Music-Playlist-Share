import { Instrument_Serif, Manrope } from "next/font/google";
import localFont from "next/font/local";

/**
 * The showcase typefaces, shared by the landing page and the public profile.
 *
 * Defined once rather than per route so the two can't drift apart, and kept out
 * of the root layout's concerns because the dashboard and admin areas use these
 * same variables -- there is no reason for a signed-in user to download a face
 * they never see.
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

/**
 * The display faces for the landing page.
 *
 * Two separate families rather than two weights of one, which is why they load
 * separately: the headline and the wordmark are set in different cuts.
 *
 * Export names and filenames are deliberately generic. next/font derives the
 * emitted @font-face family from the export identifier and the asset path from
 * the filename, so naming either after the typeface would publish it in the
 * stylesheet and in a URL.
 */
export const displayFont = localFont({
  src: "./_fonts/display-midi.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "500",
});

export const wordmarkFont = localFont({
  src: "./_fonts/display-maxi.ttf",
  variable: "--font-wordmark",
  display: "swap",
  weight: "500",
});

/** Applied to the wrapper element of any route using the showcase look. */
export const showcaseFonts = `${instrumentSerif.variable} ${manrope.variable} ${displayFont.variable} ${wordmarkFont.variable}`;
