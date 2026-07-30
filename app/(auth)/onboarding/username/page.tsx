import { redirect } from "next/navigation";

import { displayUrl } from "@/lib/app-url";
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Pick your link
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This is where people will find your playlists. You can change it later
          in settings.
        </p>

        <UsernameForm appUrl={appUrl} />
      </div>
    </div>
  );
}
