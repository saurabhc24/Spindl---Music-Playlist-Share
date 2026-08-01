import { redirect } from "next/navigation";

import { displayUrl } from "@/lib/app-url";
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

  const appUrl = displayUrl();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="serif text-3xl">
          Pick your link
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          This is where people will find your playlists. You can change it later
          in settings.
        </p>

        <UsernameForm appUrl={appUrl} />

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
