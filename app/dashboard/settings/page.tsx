import { displayUrl } from "@/lib/app-url";
import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

import { ProfileForm, UsernameSection } from "./settings-form";

export default async function SettingsPage() {
  const { user, profile } = await requireProfile();

  const previousUsernames = await prisma.usernameHistory.findMany({
    where: { userId: user.id },
    orderBy: { changedAt: "desc" },
    select: { username: true, usernameNormalized: true, changedAt: true },
    take: 10,
  });

  return (
    <div className="max-w-xl space-y-10">
      <header>
        <h1 className="serif text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-ink-dim">
          How your page introduces you.
        </p>
      </header>

      <section className="space-y-4">
        <ProfileForm
          displayName={profile.displayName ?? ""}
          bio={profile.bio ?? ""}
          isPublic={profile.isPublic}
        />
      </section>

      <hr className="border-[var(--line)]" />

      <section className="space-y-4">
        <UsernameSection
          username={profile.username}
          appUrl={displayUrl()}
        />

        {previousUsernames.length > 0 && (
          <div className="panel px-4 py-3">
            <p className="text-xs font-medium text-ink-dim">
              Previous links, still redirecting here
            </p>
            <ul className="mt-2 space-y-1">
              {previousUsernames.map((entry) => (
                <li
                  key={entry.usernameNormalized}
                  className="text-xs text-ink-faint"
                >
                  /{entry.usernameNormalized}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
