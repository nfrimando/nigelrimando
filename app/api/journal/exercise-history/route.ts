import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sets } from "@/lib/schema";
import { eq, isNotNull, asc, and, gte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const exerciseId = req.nextUrl.searchParams.get("exerciseId");
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const id = Number(exerciseId);
  if (isNaN(id)) return NextResponse.json({ error: "invalid exerciseId" }, { status: 400 });

  const from = req.nextUrl.searchParams.get("from");

  // Max value (weight) per day; fall back to max actual (reps) when no weight is logged
  const rows = await db
    .select({
      date: sets.date,
      maxValue: sql<number | null>`MAX(${sets.value})`,
      maxActual: sql<number | null>`MAX(${sets.actual})`,
      measure: sql<string | null>`MAX(${sets.measure})`,
    })
    .from(sets)
    .where(and(eq(sets.exerciseId, id), isNotNull(sets.actual), from ? gte(sets.date, from) : undefined))
    .groupBy(sets.date)
    .orderBy(asc(sets.date));

  const data = rows.map((r) => ({
    date: r.date,
    value: r.maxValue ?? r.maxActual,
    measure: r.measure,
  }));

  return NextResponse.json(data);
}
