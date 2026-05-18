import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { padelSets } from "@/lib/schema";
import { desc, asc, like, or, count, sql } from "drizzle-orm";

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
    ? or(like(padelSets.venue, `%${q}%`), like(padelSets.format, `%${q}%`))
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(padelSets).where(condition);

  const data = await db
    .select()
    .from(padelSets)
    .where(condition)
    .orderBy(desc(padelSets.matchId), asc(padelSets.setNumber))
    .limit(limit)
    .offset(offset);

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
      courtNumber: courtNumber ? Number(courtNumber) : null,
      videoUrl: videoUrl?.trim() || null,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
