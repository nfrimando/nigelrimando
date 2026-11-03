import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { interactions, journalAnswers, journalQuestions, persons, thoughts } from "@/lib/schema";
import { and, asc, eq, gte, lte } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Markdown dump of journal answers + thoughts + interactions, grouped by date.
// Meant to be pasted into an LLM for narration / analysis.
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

  const [answers, dayThoughts, dayInteractions] = await Promise.all([
    db
      .select({
        date: journalAnswers.date,
        prompt: journalAnswers.promptSnapshot,
        answerType: journalQuestions.answerType,
        textValue: journalAnswers.textValue,
        numericValue: journalAnswers.numericValue,
      })
      .from(journalAnswers)
      .innerJoin(journalQuestions, eq(journalAnswers.questionId, journalQuestions.id))
      .where(and(gte(journalAnswers.date, from), lte(journalAnswers.date, to)))
      .orderBy(asc(journalAnswers.date), asc(journalQuestions.sortOrder)),
    db
      .select({ date: thoughts.entryDate, thought: thoughts.thought, type: thoughts.type })
      .from(thoughts)
      .where(and(gte(thoughts.entryDate, from), lte(thoughts.entryDate, to)))
      .orderBy(asc(thoughts.entryDate), asc(thoughts.createdAt)),
    db
      .select({
        date: interactions.entryDate,
        personName: persons.name,
        note: interactions.note,
        sentiment: interactions.sentiment,
      })
      .from(interactions)
      .leftJoin(persons, eq(interactions.personId, persons.id))
      .where(and(gte(interactions.entryDate, from), lte(interactions.entryDate, to)))
      .orderBy(asc(interactions.entryDate), asc(interactions.rank)),
  ]);

  const dates = [
    ...new Set([
      ...answers.map((a) => a.date),
      ...dayThoughts.map((t) => t.date),
      ...dayInteractions.map((i) => i.date),
    ]),
  ].sort();

  const lines: string[] = [`# Journal export: ${from} to ${to}`, ""];
  for (const date of dates) {
    lines.push(`## ${date} (${dayHeading(date)})`, "");

    const dayAnswers = answers.filter((a) => a.date === date);
    if (dayAnswers.length > 0) {
      lines.push("### Nightly journal", "");
      for (const a of dayAnswers) {
        const value = a.answerType === "scale" ? `${a.numericValue}/5` : a.textValue;
        lines.push(`**${a.prompt}**`, value ?? "", "");
      }
    }

    const t = dayThoughts.filter((x) => x.date === date);
    if (t.length > 0) {
      lines.push("### Thoughts during the day", "");
      for (const x of t) lines.push(`- ${x.type ? `[${x.type}] ` : ""}${x.thought.replace(/\n+/g, " ")}`);
      lines.push("");
    }

    const i = dayInteractions.filter((x) => x.date === date);
    if (i.length > 0) {
      lines.push("### People interacted with", "");
      for (const x of i) {
        const sentiment =
          x.sentiment != null ? ` (sentiment ${x.sentiment > 0 ? "+" : ""}${x.sentiment})` : "";
        lines.push(`- ${x.personName ?? "Unknown"}${sentiment}${x.note ? `: ${x.note}` : ""}`);
      }
      lines.push("");
    }
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-${from}-to-${to}.md"`,
    },
  });
}
