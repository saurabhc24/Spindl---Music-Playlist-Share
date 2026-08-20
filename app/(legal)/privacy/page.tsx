import type { Metadata } from "next";

import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Spindl collects, why, and what it does with data from Google and Spotify.",
};

/**
 * Written to be read by two audiences: someone deciding whether to connect an
 * account, and a Google OAuth reviewer checking that the app discloses how it
 * handles Google user data. The second is why the YouTube section names the
 * exact scope and lists the exact fields rather than saying "your playlists".
 */
export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p>Last updated {POLICY_UPDATED}.</p>

      <p>
        Spindl turns the playlists you already have into one shareable page. It
        needs very little to do that, and this page says exactly what.
      </p>

      <h2>What Spindl stores about you</h2>
      <p>
        When you sign in, Spindl stores the name, email address and profile
        picture your sign-in provider gives it, plus the username you choose and
        anything you type into your profile — a display name and a short bio.
        That is the whole account.
      </p>

      <h2>Google user data</h2>
      <p>
        Connecting YouTube asks for one scope,{" "}
        <code>https://www.googleapis.com/auth/youtube.readonly</code>. It is
        read-only: Spindl cannot create, change or delete anything in your
        YouTube account, and never asks for permission to.
      </p>
      <p>From your playlists, Spindl reads and stores only:</p>
      <ul>
        <li>the playlist&apos;s title and description</li>
        <li>its cover image URL</li>
        <li>how many items it contains</li>
        <li>its public link and its YouTube id</li>
      </ul>
      <p>
        It does not read the tracks inside a playlist, your watch or search
        history, your subscriptions, your comments, or anything else in your
        Google Account. Signing in with Google is separate and narrower again —
        it asks only for <strong>openid</strong>, <strong>email</strong> and{" "}
        <strong>profile</strong>, which is your name, email address and picture.
      </p>
      <p>
        Spindl&apos;s use of information received from Google APIs adheres to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. That data is used only to show
        your playlists on your own Spindl page. It is never sold, never used for
        advertising, never used to train any model, and never shared with anyone
        else — except where you have published it yourself, which is the point
        of the page.
      </p>

      <h2>Spotify</h2>
      <p>
        Connecting Spotify works the same way and reads the same handful of
        fields about your playlists. Signing in with Spotify asks only for your
        email address.
      </p>

      <h2>Access tokens</h2>
      <p>
        Connecting a service gives Spindl a token so it can re-read your
        playlists later. Those tokens are encrypted before they are written to
        the database, with AES-256-GCM, and are used for nothing but fetching
        your playlists.
      </p>

      <h2>Visits</h2>
      <p>
        Spindl counts how many visits it gets each day, as a single number per
        day. It is not tied to accounts, does not identify anyone, and cannot be
        traced back to a visitor or a page.
      </p>

      <h2>What you can remove, and how</h2>
      <ul>
        <li>
          <strong>Disconnect a service</strong> from the Connections page. This
          deletes the stored token and every playlist that was imported through
          it.
        </li>
        <li>
          <strong>Hide a playlist</strong> from your page at any time without
          disconnecting anything.
        </li>
        <li>
          <strong>Revoke Spindl&apos;s access from the provider&apos;s side</strong>{" "}
          at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            Google Account permissions
          </a>{" "}
          or{" "}
          <a
            href="https://www.spotify.com/account/apps/"
            target="_blank"
            rel="noreferrer"
          >
            Spotify apps
          </a>
          . Spindl stops being able to read anything the moment you do.
        </li>
        <li>
          <strong>Delete your account entirely</strong> by emailing{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Self-serve
          deletion is not built yet, so this is currently done by hand — and
          honestly, that is the reason it is written here rather than dressed up
          as a feature.
        </li>
      </ul>

      <h2>Where it is kept</h2>
      <p>
        Spindl runs on Vercel and stores its data in a Postgres database hosted
        by Neon. Sign-in is handled by Google, Spotify or an emailed link,
        depending on which you use. Nobody else receives your data.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that affects what Spindl does with your
        data, the date at the top changes with it.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, or a deletion request:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
