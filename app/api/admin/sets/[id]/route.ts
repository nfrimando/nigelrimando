import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { sets } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { date, block, week, exerciseId, planned, actual, measure, value, notes } = body;

  const fields: Record<string, unknown> = { updatedAt: sql`(unixepoch())` };
  if (date !== undefined) fields.date = date;
  if (block !== undefined) fields.block = block;
  if (week !== undefined) fields.week = Number(week);
  if (exerciseId !== undefined) fields.exerciseId = Number(exerciseId);
  if (planned !== undefined) fields.planned = planned === "" || planned === null ? null : Number(planned);
  if (actual !== undefined) fields.actual = actual === "" || actual === null ? null : Number(actual);
  if (measure !== undefined) fields.measure = measure || null;
  if (value !== undefined) fields.value = value === "" || value === null ? null : Number(value);
  if (notes !== undefined) fields.notes = notes || null;

  const [row] = await db.update(sets).set(fields).where(eq(sets.id, Number(id))).returning();
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(sets).where(eq(sets.id, Number(id)));
  return NextResponse.json({ ok: true });
}
