import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { thoughts } from "@/lib/schema";
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
  const { entryDate, thought, type } = body;

  if (!entryDate?.trim()) {
    return NextResponse.json({ error: "Entry date is required" }, { status: 400 });
  }
  if (!thought?.trim()) {
    return NextResponse.json({ error: "Thought is required" }, { status: 400 });
  }

  const [row] = await db
    .update(thoughts)
    .set({
      entryDate: entryDate.trim(),
      thought: thought.trim(),
      type: type?.trim() || null,
    })
    .where(eq(thoughts.id, Number(id)))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(thoughts).where(eq(thoughts.id, Number(id)));
  return NextResponse.json({ ok: true });
}
