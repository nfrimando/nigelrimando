import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { transports } from "@/lib/schema";
import { desc } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db
    .select()
    .from(transports)
    .orderBy(desc(transports.date), desc(transports.createdAt));
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, startTime, endTime, eventType, mode, item, origin, destination, notes, videoUrl } = body;

  if (!date?.trim()) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  if (!eventType?.trim()) {
    return NextResponse.json({ error: "Event type is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(transports)
    .values({
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
    .returning();
  return NextResponse.json(row, { status: 201 });
}
