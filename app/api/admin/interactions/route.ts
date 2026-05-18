import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { interactions, persons } from "@/lib/schema";
import { desc, eq, like, or, count } from "drizzle-orm";

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

  const [{ total }] = await db
    .select({ total: count() })
    .from(interactions)
    .leftJoin(persons, eq(interactions.personId, persons.id))
    .where(condition);

  const data = await db
    .select(selectedFields)
    .from(interactions)
    .leftJoin(persons, eq(interactions.personId, persons.id))
    .where(condition)
    .orderBy(desc(interactions.entryDate), desc(interactions.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { entryDate, personId, rank, note, sentiment } = body;

  if (!entryDate?.trim()) {
    return NextResponse.json({ error: "Entry date is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(interactions)
    .values({
      entryDate: entryDate.trim(),
      personId: personId ? Number(personId) : null,
      rank: rank != null && rank !== "" ? Number(rank) : null,
      note: note?.trim() || null,
      sentiment: sentiment != null && sentiment !== "" ? Number(sentiment) : null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
