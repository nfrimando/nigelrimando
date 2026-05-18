import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { transports } from "@/lib/schema";
import { eq } from "drizzle-orm";

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
  const { date, startTime, endTime, eventType, mode, item, origin, destination, notes, videoUrl } = body;

  if (!date?.trim()) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  if (!eventType?.trim()) {
    return NextResponse.json({ error: "Event type is required" }, { status: 400 });
  }

  const [row] = await db
    .update(transports)
    .set({
      date: date.trim(),
      startTime: startTime?.trim() || null,
      endTime: endTime?.trim() || null,
      eventType: eventType.trim(),
      mode: mode?.trim() || null,
      item: item?.trim() || null,
      origin: origin?.trim() || null,
      destination: destination?.trim() || null,
      notes: notes?.trim() || null,
      videoUrl: videoUrl?.trim() || null,
    })
    .where(eq(transports.id, Number(id)))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(transports).where(eq(transports.id, Number(id)));
  return NextResponse.json({ ok: true });
}
