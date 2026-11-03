import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { journalAnswers, journalQuestions } from "@/lib/schema";
import { and, eq, gte, lte } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Per-day status for the calendar strip. A day is "complete" when every
// currently required + active question has an answer, otherwise "partial".
export async function GET(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
  }

  const [rows, required] = await Promise.all([
    db
      .select({ date: journalAnswers.date, questionId: journalAnswers.questionId })
      .from(journalAnswers)
      .where(and(gte(journalAnswers.date, from), lte(journalAnswers.date, to))),
    db
      .select({ id: journalQuestions.id })
      .from(journalQuestions)
      .where(and(eq(journalQuestions.isRequired, true), eq(journalQuestions.isActive, true))),
  ]);

  const answeredByDate = new Map<string, Set<number>>();
  for (const r of rows) {
    if (!answeredByDate.has(r.date)) answeredByDate.set(r.date, new Set());
    answeredByDate.get(r.date)!.add(r.questionId);
  }

  const days: Record<string, { status: "complete" | "partial"; answered: number }> = {};
  for (const [date, ids] of answeredByDate) {
    const complete = required.every((q) => ids.has(q.id));
    days[date] = { status: complete ? "complete" : "partial", answered: ids.size };
  }

  return NextResponse.json({ from, to, days });
}
