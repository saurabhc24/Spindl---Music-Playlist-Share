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
    // The backdrop comes from the (auth) layout, shared with both login screens.
    //
    // Centred while there is room, top-aligned once there isn't. The condition
    // is on height rather than width because the thing that takes the room away
    // is the on-screen keyboard: with the viewport meta set to resize the
    // layout, opening it shrinks the viewport, this query stops matching, and
    // the field rises to the top instead of the whole block being pushed under
    // the keyboard. Centring is what makes a short viewport unusable -- it puts
    // the submit button where the keyboard is.
    <div className="flex flex-1 justify-center px-7 py-10 [@media(min-height:640px)]:items-center sm:py-16">
      <div className="w-full max-w-md">
          <h1 className="heading text-[34px] font-bold leading-tight">
            Pick your link
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-dim">
            that’s where people will land on your playlist. you can always
            change it later in settings, no worries.
          </p>

          <UsernameForm />

          {/* Landing here means this account has no profile yet -- which, for
              someone with more than one Google account, usually means they
              signed in with the wrong one. Naming the account makes that
              obvious, and the sign-out link is the only way back: this page sits
              outside the dashboard layout, so without it there is no way to
              switch accounts from here short of clearing cookies. */}
          {/* Left-aligned under the button rather than centred beneath it, so
              the whole column reads as one left edge. */}
          <div className="mt-8 text-sm text-ink-faint">
            <p className="break-words">
              Signing in as {user.email ?? "an unknown account"}
            </p>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
              className="mt-1.5 flex items-center gap-1.5"
            >
              <span>Not you?</span>
              <button
                type="submit"
                className="font-medium text-accent underline underline-offset-4 transition-colors hover:text-ink"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
    </div>
  );
}
