import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { and, asc, gte, lte, sql } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

type Granularity = "day" | "week" | "month";

export async function GET(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const granularity = (searchParams.get("granularity") ?? "month") as Granularity;

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 });
  }

  const periodExpr =
    granularity === "month"
      ? sql<string>`substr(${expenses.date}, 1, 7)`
      : granularity === "week"
        ? sql<string>`strftime('%Y-W%W', ${expenses.date})`
        : expenses.date;

  const rows = await db
    .select({
      period: periodExpr,
      category: expenses.category,
      amount: sql<number>`SUM(${expenses.amount})`,
    })
    .from(expenses)
    .where(and(gte(expenses.date, from), lte(expenses.date, to)))
    .groupBy(periodExpr, expenses.category)
    .orderBy(asc(periodExpr), asc(expenses.category));

  const periods = [...new Set(rows.map((r) => r.period))].sort();
  const categories = [...new Set(rows.map((r) => r.category))].sort();

  return NextResponse.json({ periods, categories, rows });
}
