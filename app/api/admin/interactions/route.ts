import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { interactions, persons } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
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
    })
    .from(interactions)
    .leftJoin(persons, eq(interactions.personId, persons.id))
    .orderBy(desc(interactions.entryDate), desc(interactions.createdAt));

  return NextResponse.json(rows);
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
