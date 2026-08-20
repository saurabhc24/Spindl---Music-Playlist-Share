import type { Metadata } from "next";

import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms you agree to by using Spindl.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms</h1>
      <p>Last updated {POLICY_UPDATED}.</p>

      <p>
        Spindl gives you one page that shows the playlists you already have,
        wherever they live. Using it means agreeing to what follows.
      </p>

      <h2>Your account</h2>
      <p>
        You need an account to make a page, and you are responsible for what
        happens under it. Pick a username you are entitled to use — names that
        impersonate somebody else, or that are chosen to be mistaken for a brand
        or for Spindl itself, can be taken back.
      </p>

      <h2>Your playlists stay yours</h2>
      <p>
        Spindl does not own, host or copy your music. It reads the title, cover
        and link of a playlist from Spotify or YouTube and shows them, and every
        play happens on the service the playlist actually lives on, under that
        service&apos;s own terms. The words you write — your display name, your
        bio — stay yours; publishing a page just means you are asking Spindl to
        show them.
      </p>

      <h2>What not to do</h2>
      <ul>
        <li>Pretend to be someone else, or imply an endorsement you don&apos;t have.</li>
        <li>Publish anything unlawful, or anything you have no right to publish.</li>
        <li>
          Automate account creation, claim usernames in bulk, or work around the
          rate limits.
        </li>
        <li>Interfere with the service, or with anyone else&apos;s use of it.</li>
      </ul>

      <h2>Suspension and removal</h2>
      <p>
        A page that breaks the above can be suspended, which makes it stop
        resolving publicly, or deleted. Deletion is reversible for a period, so
        if you think a decision was wrong, say so and it can be undone.
      </p>

      <h2>Availability</h2>
      <p>
        Spindl is provided as it is, with no guarantee that it will be available,
        uninterrupted or free of faults. It depends on Spotify, YouTube and
        Google, any of which can change or withdraw access at any time, which
        would change what Spindl can do. Keep your own copy of anything you would
        be sorry to lose.
      </p>

      <h2>Ending it</h2>
      <p>
        You can stop using Spindl whenever you like — disconnect your services
        from the Connections page, or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to have the
        account removed.
      </p>

      <h2>Changes</h2>
      <p>
        These terms can change. Material changes come with a new date at the top.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
