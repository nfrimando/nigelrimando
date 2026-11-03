import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { JOURNAL_ANSWER_TYPES, journalAnswers, journalQuestions } from "@/lib/schema";
import { count, eq, sql } from "drizzle-orm";

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

  if ("answerType" in body && !JOURNAL_ANSWER_TYPES.includes(body.answerType)) {
    return NextResponse.json(
      { error: `answerType must be one of: ${JOURNAL_ANSWER_TYPES.join(", ")}` },
      { status: 400 },
    );
  }
  if ("prompt" in body && !body.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ("prompt" in body) update.prompt = body.prompt.trim();
  if ("helpText" in body) update.helpText = body.helpText?.trim() || null;
  if ("category" in body) update.category = body.category?.trim() || null;
  if ("answerType" in body) update.answerType = body.answerType;
  if ("isRequired" in body) update.isRequired = body.isRequired;
  if ("isDefaultOn" in body) update.isDefaultOn = body.isDefaultOn;
  if ("isActive" in body) update.isActive = body.isActive;
  if ("sortOrder" in body) update.sortOrder = body.sortOrder;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [row] = await db
    .update(journalQuestions)
    .set({ ...update, updatedAt: sql`(unixepoch())` })
    .where(eq(journalQuestions.id, Number(id)))
    .returning();

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

  // Answered questions are history — retire them (isActive = false) instead.
  const [{ n }] = await db
    .select({ n: count() })
    .from(journalAnswers)
    .where(eq(journalAnswers.questionId, Number(id)));
  if (n > 0) {
    return NextResponse.json(
      { error: `This question has ${n} answer(s). Deactivate it instead.` },
      { status: 409 },
    );
  }

  await db.delete(journalQuestions).where(eq(journalQuestions.id, Number(id)));
  return NextResponse.json({ ok: true });
}
