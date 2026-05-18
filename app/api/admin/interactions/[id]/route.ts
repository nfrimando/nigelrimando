import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { interactions } from "@/lib/schema";
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
  const { entryDate, personId, rank, note, sentiment } = body;

  if (!entryDate?.trim()) {
    return NextResponse.json({ error: "Entry date is required" }, { status: 400 });
  }

  const [row] = await db
    .update(interactions)
    .set({
      entryDate: entryDate.trim(),
      personId: personId ? Number(personId) : null,
      rank: rank != null && rank !== "" ? Number(rank) : null,
      note: note?.trim() || null,
      sentiment: sentiment != null && sentiment !== "" ? Number(sentiment) : null,
    })
    .where(eq(interactions.id, Number(id)))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(interactions).where(eq(interactions.id, Number(id)));
  return NextResponse.json({ ok: true });
}
