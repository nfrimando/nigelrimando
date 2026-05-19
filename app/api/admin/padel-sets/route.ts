import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { padelSets, persons } from "@/lib/schema";
import { desc, asc, getTableColumns, like, or, inArray, sql } from "drizzle-orm";

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

  let matchingPersonIds: number[] = [];
  if (q) {
    const matched = await db
      .select({ id: persons.id })
      .from(persons)
      .where(or(like(persons.name, `%${q}%`), like(persons.nickname, `%${q}%`)));
    matchingPersonIds = matched.map((p) => p.id);
  }

  const condition = q
    ? or(
        like(padelSets.venue, `%${q}%`),
        like(padelSets.format, `%${q}%`),
        ...(matchingPersonIds.length > 0
          ? [
              inArray(padelSets.teammateLeft, matchingPersonIds),
              inArray(padelSets.teammateRight, matchingPersonIds),
              inArray(padelSets.opponentLeft, matchingPersonIds),
              inArray(padelSets.opponentRight, matchingPersonIds),
            ]
          : []),
      )
    : undefined;

  const rows = await db
    .select({ ...getTableColumns(padelSets), total: sql<number>`COUNT(*) OVER()` })
    .from(padelSets)
    .where(condition)
    .orderBy(desc(padelSets.matchId), asc(padelSets.setNumber))
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
    notes,
  } = body;

  if (
    !date ||
    matchId == null ||
    setNumber == null ||
    !teammateLeft ||
    !teammateRight ||
    !opponentLeft ||
    !opponentRight ||
    gamesWon == null ||
    gamesLost == null
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [row] = await db
    .insert(padelSets)
    .values({
      date,
      matchId: Number(matchId),
      setNumber: Number(setNumber),
      teammateLeft: Number(teammateLeft),
      teammateRight: Number(teammateRight),
      opponentLeft: Number(opponentLeft),
      opponentRight: Number(opponentRight),
      gamesWon: Number(gamesWon),
      gamesLost: Number(gamesLost),
      format: format || null,
      venue: venue || null,
      courtNumber: courtNumber || null,
      videoUrl: videoUrl?.trim() || null,
      notes: notes || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
