import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { padelSets } from "@/lib/schema";
import { max } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ maxId }] = await db.select({ maxId: max(padelSets.matchId) }).from(padelSets);
  return NextResponse.json({ nextMatchId: (maxId ?? 0) + 1 });
}
