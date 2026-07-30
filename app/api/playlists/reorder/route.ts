import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  // Full ordered list of playlist ids as displayed in the dashboard.
  ids: z.array(z.string().min(1)).min(1).max(500),
});

const SORT_ORDER_STEP = 1000;

export async function POST(request: Request) {
  const { user, profile } = await requireProfile();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { ids } = parsed.data;

  // Only reorder rows this user actually owns -- ids come from the client.
  const owned = await prisma.playlist.findMany({
    where: { userId: user.id, id: { in: ids } },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((row) => row.id));
  const orderedIds = ids.filter((id) => ownedIds.has(id));

  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "No matching playlists" }, { status: 400 });
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.playlist.update({
        where: { id },
        data: { sortOrder: (index + 1) * SORT_ORDER_STEP },
      })
    )
  );

  revalidatePath(`/${profile.username}`);

  return NextResponse.json({ ok: true });
}
