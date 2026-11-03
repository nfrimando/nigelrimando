import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import {
  expenses,
  interactions,
  journalAnswers,
  journalQuestions,
  padelSets,
  persons,
  sets,
  thoughts,
  transports,
} from "@/lib/schema";
import { and, asc, count, eq, inArray, or, sql, sum } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Date must be YYYY-MM-DD" }, { status: 400 });
  }

  const answers = await db.select().from(journalAnswers).where(eq(journalAnswers.date, date));
  const answeredIds = answers.map((a) => a.questionId);

  // Active questions, plus retired ones that were answered on this date.
  const questions = await db
    .select()
    .from(journalQuestions)
    .where(
      answeredIds.length > 0
        ? or(eq(journalQuestions.isActive, true), inArray(journalQuestions.id, answeredIds))
        : eq(journalQuestions.isActive, true),
    )
    .orderBy(asc(journalQuestions.sortOrder), asc(journalQuestions.id));

  const [dayThoughts, dayInteractions, [setCount], [padelCount], [tripCount], [expenseTotal]] =
    await Promise.all([
      db
        .select({ id: thoughts.id, thought: thoughts.thought, type: thoughts.type })
        .from(thoughts)
        .where(eq(thoughts.entryDate, date))
        .orderBy(asc(thoughts.createdAt)),
      db
        .select({
          id: interactions.id,
          personName: persons.name,
          personNickname: persons.nickname,
          note: interactions.note,
          sentiment: interactions.sentiment,
        })
        .from(interactions)
        .leftJoin(persons, eq(interactions.personId, persons.id))
        .where(eq(interactions.entryDate, date))
        .orderBy(asc(interactions.rank)),
      db.select({ n: count() }).from(sets).where(eq(sets.date, date)),
      db.select({ n: count() }).from(padelSets).where(eq(padelSets.date, date)),
      db
        .select({ n: count() })
        .from(transports)
        .where(and(eq(transports.date, date), eq(transports.eventType, "trip"))),
      db
        .select({ n: count(), total: sum(expenses.amount) })
        .from(expenses)
        .where(eq(expenses.date, date)),
    ]);

  return NextResponse.json({
    date,
    questions,
    answers,
    context: {
      thoughts: dayThoughts,
      interactions: dayInteractions,
      gymSets: setCount.n,
      padelSets: padelCount.n,
      trips: tripCount.n,
      expenses: { count: expenseTotal.n, total: Number(expenseTotal.total ?? 0) },
    },
  });
}

type AnswerInput = { questionId: number; textValue?: string | null; numericValue?: number | null };

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Date must be YYYY-MM-DD" }, { status: 400 });
  }

  const body = await req.json();
  const input: AnswerInput[] = Array.isArray(body.answers) ? body.answers : [];
  if (input.length === 0) {
    return NextResponse.json({ error: "answers is required" }, { status: 400 });
  }

  const ids = input.map((a) => Number(a.questionId));
  const questions = await db
    .select()
    .from(journalQuestions)
    .where(inArray(journalQuestions.id, ids));
  const byId = new Map(questions.map((q) => [q.id, q]));

  for (const a of input) {
    const q = byId.get(Number(a.questionId));
    if (!q) {
      return NextResponse.json({ error: `Unknown question ${a.questionId}` }, { status: 400 });
    }
    if (q.answerType === "scale" && a.numericValue != null) {
      const v = Number(a.numericValue);
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        return NextResponse.json({ error: `"${q.prompt}" must be 1–5` }, { status: 400 });
      }
    }
  }

  for (const a of input) {
    const q = byId.get(Number(a.questionId))!;
    const textValue = a.textValue?.trim() || null;
    const numericValue = q.answerType === "scale" && a.numericValue != null ? Number(a.numericValue) : null;

    // An emptied answer means "skip" — clear any previous one.
    if (textValue === null && numericValue === null) {
      await db
        .delete(journalAnswers)
        .where(and(eq(journalAnswers.date, date), eq(journalAnswers.questionId, q.id)));
      continue;
    }

    await db
      .insert(journalAnswers)
      .values({ date, questionId: q.id, promptSnapshot: q.prompt, textValue, numericValue })
      .onConflictDoUpdate({
        target: [journalAnswers.date, journalAnswers.questionId],
        set: { promptSnapshot: q.prompt, textValue, numericValue, updatedAt: sql`(unixepoch())` },
      });
  }

  const answers = await db.select().from(journalAnswers).where(eq(journalAnswers.date, date));
  return NextResponse.json({ date, answers });
}
