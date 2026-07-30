import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireProfile } from "@/lib/dal";
import {
  PayloadTooLargeError,
  clientIp,
  rateLimitedResponse,
  readJsonBody,
  tooLargeResponse,
} from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, rateLimitAll } from "@/lib/rate-limit";

const bodySchema = z.object({
  // Full ordered list of playlist ids as displayed in the dashboard.
  // Bounded so a crafted request can't turn one call into thousands of writes.
  ids: z.array(z.string().min(1).max(64)).min(1).max(500),
});

const SORT_ORDER_STEP = 1000;
// 500 cuid-ish ids plus JSON overhead sits comfortably under this.
const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: Request) {
  const { user, profile } = await requireProfile();

  const limited = await rateLimitAll([
    { key: `curation:user:${user.id}`, rule: RATE_LIMITS.curationPerAccount },
    { key: `curation:ip:${clientIp(request)}`, rule: RATE_LIMITS.curationPerIp },
  ]);
  if (!limited.ok) return rateLimitedResponse(limited);

  let raw: unknown;
  try {
    raw = await readJsonBody(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return tooLargeResponse(error.maxBytes);
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
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
