import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { requireProfile } from "@/lib/dal";
import { parseProviderSlug } from "@/lib/providers";
import { prisma } from "@/lib/prisma";
import { SyncError, syncProvider } from "@/lib/sync";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/sync/[provider]">
) {
  const { user, profile } = await requireProfile();

  const { provider: slug } = await context.params;
  const provider = parseProviderSlug(slug);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const connection = await prisma.connectedAccount.findUnique({
    where: { userId_provider: { userId: user.id, provider } },
  });
  if (!connection) {
    return NextResponse.json(
      { error: "That account isn't connected." },
      { status: 400 }
    );
  }

  try {
    const result = await syncProvider({ userId: user.id, connection });

    revalidatePath(`/${profile.username}`);
    revalidatePath("/dashboard/playlists");

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof SyncError) {
      return NextResponse.json(
        { error: error.message, needsReconnect: error.needsReconnect },
        { status: 400 }
      );
    }
    console.error(`[sync:${slug}] failed`, error);
    return NextResponse.json(
      { error: "Sync failed. Please try again." },
      { status: 500 }
    );
  }
}
