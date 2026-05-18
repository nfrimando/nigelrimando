import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { sets, exercises } from "@/lib/schema";
import { desc, eq, getTableColumns, inArray, like, sql } from "drizzle-orm";

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

  let exerciseIds: number[] | null = null;
  if (q) {
    const matches = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(like(exercises.name, `%${q}%`));
    exerciseIds = matches.map((e) => e.id);
    if (exerciseIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, totalPages: 0 });
    }
  }

  const baseCondition = exerciseIds ? inArray(sets.exerciseId, exerciseIds) : undefined;

  const rows = await db
    .select({ ...getTableColumns(sets), total: sql<number>`COUNT(*) OVER()` })
    .from(sets)
    .where(baseCondition)
    .orderBy(desc(sets.date), desc(sets.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.total ?? 0;
  const data = rows.map(({ total: _, ...rest }) => rest);

  return NextResponse.json({
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, block, week, exerciseId, planned, actual, measure, value, notes } = body;

  if (!date || !block || !week || !exerciseId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [row] = await db
    .insert(sets)
    .values({
      date,
      block,
      week: Number(week),
      exerciseId: Number(exerciseId),
      planned: planned ? Number(planned) : null,
      actual: actual ? Number(actual) : null,
      measure: measure || null,
      value: value ? Number(value) : null,
      notes: notes || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ids, block, week, date } = body as {
    ids: number[];
    block?: string;
    week?: number;
    date?: string;
  };

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }

  const fields: Record<string, unknown> = { updatedAt: sql`(unixepoch())` };
  if (block !== undefined && block !== "") fields.block = block;
  if (week !== undefined && week !== null) fields.week = Number(week);
  if (date !== undefined && date !== "") fields.date = date;

  if (Object.keys(fields).length === 1) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db.update(sets).set(fields).where(inArray(sets.id, ids));
  return NextResponse.json({ updated: ids.length });
}
