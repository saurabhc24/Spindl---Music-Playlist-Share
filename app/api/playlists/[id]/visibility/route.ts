import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ visible: z.boolean() });

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/playlists/[id]/visibility">
) {
  const { user, profile } = await requireProfile();
  const { id } = await context.params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Scoping the update by userId means someone else's id simply matches nothing.
  const { count } = await prisma.playlist.updateMany({
    where: { id, userId: user.id },
    data: { visible: parsed.data.visible },
  });

  if (count === 0) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  revalidatePath(`/${profile.username}`);

  return NextResponse.json({ ok: true, visible: parsed.data.visible });
}
