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

const bodySchema = z.object({ visible: z.boolean() });

const MAX_BODY_BYTES = 1024;

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/playlists/[id]/visibility">
) {
  const { user, profile } = await requireProfile();
  const { id } = await context.params;

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
