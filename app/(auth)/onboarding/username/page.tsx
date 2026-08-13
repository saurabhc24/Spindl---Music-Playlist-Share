import { redirect } from "next/navigation";

import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

import { UsernameForm } from "./username-form";

export default async function ClaimUsernamePage() {
  const user = await requireUser();

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (profile) redirect("/dashboard");

  return (
    // Centred while there is room, top-aligned once there isn't. The condition
    // is on height rather than width because the thing that takes the room away
    // is the on-screen keyboard: with the viewport meta below set to resize the
    // layout, opening it shrinks the viewport, this query stops matching, and
    // the field rises to the top instead of the whole block being pushed under
    // the keyboard. Centring is what makes a short viewport unusable -- it puts
    // the submit button exactly where the keyboard is.
    <div className="flex flex-1 justify-center px-6 py-10 [@media(min-height:640px)]:items-center sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="heading text-3xl">
          Pick your link
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          This is where people will find your playlists. You can change it later
          in settings.
        </p>

        <UsernameForm />

        {/* Landing here means this account has no profile yet -- which, for
            someone with more than one Google account, usually means they signed
            in with the wrong one. Naming the account makes that obvious, and the
            sign-out link is the only way back: this page sits outside the
            dashboard layout, so without it there is no way to switch accounts
            from here short of clearing cookies. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-ink-faint">
          <span>Signed in as {user.email ?? "an unknown account"}.</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="underline underline-offset-4 transition-colors hover:text-ink"
            >
              Not you? Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
