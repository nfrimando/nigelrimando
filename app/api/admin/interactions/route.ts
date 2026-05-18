import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { interactions, persons } from "@/lib/schema";
import { desc, eq, like, or, sql } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

const selectedFields = {
  id: interactions.id,
  entryDate: interactions.entryDate,
  personId: interactions.personId,
  personName: persons.name,
  personNickname: persons.nickname,
  rank: interactions.rank,
  note: interactions.note,
  sentiment: interactions.sentiment,
  createdAt: interactions.createdAt,
  updatedAt: interactions.updatedAt,
};

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
        like(interactions.entryDate, `%${q}%`),
        like(interactions.note, `%${q}%`),
        like(persons.name, `%${q}%`),
        like(persons.nickname, `%${q}%`),
      )
    : undefined;

  const rows = await db
    .select({ ...selectedFields, total: sql<number>`COUNT(*) OVER()` })
    .from(interactions)
    .leftJoin(persons, eq(interactions.personId, persons.id))
    .where(condition)
    .orderBy(desc(interactions.entryDate), desc(interactions.createdAt))
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
  const rows: { entryDate: string; personId?: string; rank?: string; note?: string; sentiment?: string }[] =
    body.interactions ?? [body];

  for (const row of rows) {
    if (!row.entryDate?.trim()) {
      return NextResponse.json({ error: "Entry date is required for all rows" }, { status: 400 });
    }
  }

  const created = await db
    .insert(interactions)
    .values(
      rows.map(({ entryDate, personId, rank, note, sentiment }) => ({
        entryDate: entryDate.trim(),
        personId: personId ? Number(personId) : null,
        rank: rank != null && rank !== "" ? Number(rank) : null,
        note: note?.trim() || null,
        sentiment: sentiment != null && sentiment !== "" ? Number(sentiment) : null,
      }))
    )
    .returning();

  return NextResponse.json(created, { status: 201 });
}
