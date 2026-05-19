import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { habitEntries, habits } from "@/lib/schema";
import { desc, eq, getTableColumns, like, or, sql } from "drizzle-orm";

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
        like(habitEntries.date, `%${q}%`),
        like(habits.label, `%${q}%`),
        like(habits.key, `%${q}%`),
      )
    : undefined;

  const rows = await db
    .select({
      ...getTableColumns(habitEntries),
      habitLabel: habits.label,
      habitKey: habits.key,
      total: sql<number>`COUNT(*) OVER()`,
    })
    .from(habitEntries)
    .innerJoin(habits, eq(habitEntries.habitId, habits.id))
    .where(condition)
    .orderBy(desc(habitEntries.date), desc(habitEntries.createdAt))
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
  const { date, habitId, numericValue, textValue } = body;

  if (!date?.trim()) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (!habitId) return NextResponse.json({ error: "Habit is required" }, { status: 400 });

  const [row] = await db
    .insert(habitEntries)
    .values({
      date: date.trim(),
      habitId: Number(habitId),
      numericValue: numericValue !== "" && numericValue != null ? Number(numericValue) : null,
      textValue: textValue?.trim() || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
