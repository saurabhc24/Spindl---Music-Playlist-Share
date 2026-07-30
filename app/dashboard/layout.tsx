import Link from "next/link";

import { requireProfile } from "@/lib/dal";
import { signOut } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/connections", label: "Connections" },
  { href: "/dashboard/playlists", label: "Playlists" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Spindl
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/${profile.username}`}
              className="text-sm text-zinc-500 transition-colors hover:text-foreground dark:text-zinc-400"
            >
              View my page
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-zinc-500 transition-colors hover:text-foreground dark:text-zinc-400"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <nav className="mx-auto w-full max-w-5xl px-6">
          <ul className="flex gap-6 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="-mb-px inline-block whitespace-nowrap border-b-2 border-transparent py-3 text-sm text-zinc-600 transition-colors hover:border-zinc-300 hover:text-foreground dark:text-zinc-400 dark:hover:border-zinc-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
