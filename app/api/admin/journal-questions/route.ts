import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { JOURNAL_ANSWER_TYPES, JournalAnswerType, journalQuestions } from "@/lib/schema";
import { asc, max } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(journalQuestions)
    .orderBy(asc(journalQuestions.sortOrder), asc(journalQuestions.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { key, prompt, helpText, category, answerType, isRequired, isDefaultOn, isActive } = body;

  if (!key?.trim()) return NextResponse.json({ error: "Key is required" }, { status: 400 });
  if (!prompt?.trim()) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  if (answerType !== undefined && !JOURNAL_ANSWER_TYPES.includes(answerType)) {
    return NextResponse.json(
      { error: `answerType must be one of: ${JOURNAL_ANSWER_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // New questions go to the end of the interview.
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(journalQuestions.sortOrder) })
    .from(journalQuestions);

  const [row] = await db
    .insert(journalQuestions)
    .values({
      key: key.trim(),
      prompt: prompt.trim(),
      helpText: helpText?.trim() || null,
      category: category?.trim() || null,
      answerType: (answerType as JournalAnswerType) ?? "text",
      isRequired: isRequired === true,
      isDefaultOn: isDefaultOn !== false,
      isActive: isActive !== false,
      sortOrder: (maxOrder ?? 0) + 1,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
