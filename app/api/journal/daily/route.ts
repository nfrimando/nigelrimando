import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sets, exercises } from "@/lib/schema";
import { eq, and, isNotNull, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const rows = await db
    .select({
      exerciseId: sets.exerciseId,
      name: exercises.name,
      actual: sets.actual,
      value: sets.value,
      measure: sets.measure,
    })
    .from(sets)
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(and(eq(sets.date, date), isNotNull(sets.actual)))
    .orderBy(asc(sets.date), asc(sets.id));

  // Group by exercise
  const grouped: Record<number, { name: string; sets: { actual: number | null; value: number | null; measure: string | null }[] }> = {};
  for (const row of rows) {
    if (!grouped[row.exerciseId]) {
      grouped[row.exerciseId] = { name: row.name, sets: [] };
    }
    grouped[row.exerciseId].sets.push({ actual: row.actual, value: row.value, measure: row.measure });
  }

  const data = Object.entries(grouped).map(([id, g]) => ({ exerciseId: Number(id), ...g }));
  return NextResponse.json(data);
}
