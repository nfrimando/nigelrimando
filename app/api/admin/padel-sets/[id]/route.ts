import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { padelSets } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    date,
    matchId,
    setNumber,
    teammateLeft,
    teammateRight,
    opponentLeft,
    opponentRight,
    gamesWon,
    gamesLost,
    format,
    venue,
    courtNumber,
    videoUrl,
  } = body;

  const fields: Record<string, unknown> = { updatedAt: sql`(unixepoch())` };
  if (date !== undefined) fields.date = date || null;
  if (matchId !== undefined) fields.matchId = matchId ? Number(matchId) : null;
  if (setNumber !== undefined) fields.setNumber = setNumber ? Number(setNumber) : null;
  if (teammateLeft !== undefined) fields.teammateLeft = teammateLeft ? Number(teammateLeft) : null;
  if (teammateRight !== undefined) fields.teammateRight = teammateRight ? Number(teammateRight) : null;
  if (opponentLeft !== undefined) fields.opponentLeft = opponentLeft ? Number(opponentLeft) : null;
  if (opponentRight !== undefined) fields.opponentRight = opponentRight ? Number(opponentRight) : null;
  if (gamesWon !== undefined) fields.gamesWon = gamesWon !== "" ? Number(gamesWon) : null;
  if (gamesLost !== undefined) fields.gamesLost = gamesLost !== "" ? Number(gamesLost) : null;
  if (format !== undefined) fields.format = format || null;
  if (venue !== undefined) fields.venue = venue || null;
  if (courtNumber !== undefined) fields.courtNumber = courtNumber || null;
  if (videoUrl !== undefined) fields.videoUrl = videoUrl?.trim() || null;

  const [row] = await db
    .update(padelSets)
    .set(fields)
    .where(eq(padelSets.id, Number(id)))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(padelSets).where(eq(padelSets.id, Number(id)));
  return NextResponse.json({ ok: true });
}
