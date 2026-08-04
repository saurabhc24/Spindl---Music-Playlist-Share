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
 * NaN Jaune, the landing page's display face, self-hosted.
 *
 * Midi and Maxi are separate families rather than weights of one, which is why
 * they load separately: the design sets the headline in Midi and the wordmark in
 * Maxi. Files live under app/_fonts -- the underscore keeps the folder out of
 * the router, and next/font hashes and serves them, so they are not exposed at a
 * guessable public path.
 *
 * These are the TRIAL cut, licensed for personal use. Fine for this project;
 * swap in the retail woff2 files if Spindl ever needs a commercial licence.
 */
export const nanJauneMidi = localFont({
  src: "./_fonts/NaNJaune-MidiMedium.ttf",
  variable: "--font-display",
  display: "swap",
  weight: "500",
});

export const nanJauneMaxi = localFont({
  src: "./_fonts/NaNJaune-MaxiMedium.ttf",
  variable: "--font-wordmark",
  display: "swap",
  weight: "500",
});

/** Applied to the wrapper element of any route using the showcase look. */
export const showcaseFonts = `${instrumentSerif.variable} ${manrope.variable} ${nanJauneMidi.variable} ${nanJauneMaxi.variable}`;
