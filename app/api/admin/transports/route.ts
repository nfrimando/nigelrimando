import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { transports } from "@/lib/schema";
import { desc, getTableColumns, like, or, sql } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25")));
  const q = searchParams.get("q")?.trim() ?? "";
  const offset = (page - 1) * limit;

  const condition = q
    ? or(
        like(transports.date, `%${q}%`),
        like(transports.eventType, `%${q}%`),
        like(transports.mode, `%${q}%`),
        like(transports.origin, `%${q}%`),
        like(transports.destination, `%${q}%`),
        like(transports.notes, `%${q}%`),
      )
    : undefined;

  const rows = await db
    .select({ ...getTableColumns(transports), total: sql<number>`COUNT(*) OVER()` })
    .from(transports)
    .where(condition)
    .orderBy(desc(transports.date), desc(transports.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.total ?? 0;
  const data = rows.map(({ total: _, ...rest }) => rest);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
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
