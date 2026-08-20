/**
 * The two facts the legal pages share.
 *
 * Held here rather than typed into each page because Google's OAuth review
 * checks that the contact address on the consent screen matches the one in the
 * privacy policy -- two copies is one chance for them to disagree.
 */

/** Must match the support email on the OAuth consent screen. */
export const CONTACT_EMAIL = "saurabhc0301@gmail.com";

/** Shown on both pages. Bump it when the wording changes materially. */
export const POLICY_UPDATED = "21 August 2026";
