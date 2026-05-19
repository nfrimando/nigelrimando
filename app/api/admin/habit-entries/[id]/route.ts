import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { habitEntries } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { date, habitId, numericValue, textValue } = body;

  if (!date?.trim()) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  if (!habitId) return NextResponse.json({ error: "Habit is required" }, { status: 400 });

  const [row] = await db
    .update(habitEntries)
    .set({
      date: date.trim(),
      habitId: Number(habitId),
      numericValue: numericValue !== "" && numericValue != null ? Number(numericValue) : null,
      textValue: textValue?.trim() || null,
    })
    .where(eq(habitEntries.id, Number(id)))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(habitEntries).where(eq(habitEntries.id, Number(id)));
  return NextResponse.json({ ok: true });
}
