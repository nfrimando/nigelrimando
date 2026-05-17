/**
 * Seed script: imports exercise and set history from CSV exports of Google Sheets.
 *
 * Usage:
 *   1. Export your exercises sheet as CSV → scripts/data/exercises.csv
 *      Expected columns: Name, Primary Target, Secondary Target
 *   2. Export your sets sheet as CSV → scripts/data/sets.csv
 *      Expected columns: Date, Block, Week, Exercise, Count, Actual, Kgs, Lbs, Notes
 *   3. Add Turso credentials to .env.local
 *   4. Run: npx tsx scripts/seed.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { exercises, sets } from "../lib/schema";

// Load env from .env.local
import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env.local") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields with commas inside
// ---------------------------------------------------------------------------

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFloat(val: string): number | null {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toInt(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

/** Parse a date string that may be MM/DD/YYYY, YYYY-MM-DD, or other formats */
function parseDate(raw: string): string {
  if (!raw) throw new Error("Empty date value");

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // MM/DD/YYYY or M/D/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try native Date as fallback
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  throw new Error(`Unrecognised date format: ${raw}`);
}

// ---------------------------------------------------------------------------
// Phase 1: seed exercises
// ---------------------------------------------------------------------------

async function seedExercises(
  rows: Record<string, string>[]
): Promise<Map<string, number>> {
  const nameToId = new Map<string, number>();

  for (const row of rows) {
    const name = row["Name"]?.trim();
    if (!name) continue;

    const result = await db
      .insert(exercises)
      .values({
        name,
        type: "reps",
        primaryTarget: row["Primary Target"]?.trim() ?? "",
        secondaryTarget: row["Secondary Target"]?.trim() || null,
      })
      .returning({ id: exercises.id });

    nameToId.set(name.toLowerCase(), result[0].id);
  }

  console.log(`Inserted ${nameToId.size} exercises.`);
  return nameToId;
}

// ---------------------------------------------------------------------------
// Phase 2: seed sets + update exercise types
// ---------------------------------------------------------------------------

async function seedSets(
  rows: Record<string, string>[],
  nameToId: Map<string, number>
): Promise<void> {
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const exerciseName = row["Exercise"]?.trim();
    const rawDate = row["Date"]?.trim();

    if (!exerciseName || !rawDate) {
      skipped++;
      continue;
    }

    const exerciseId = nameToId.get(exerciseName.toLowerCase());
    if (exerciseId === undefined) {
      console.warn(
        `  ⚠ Exercise not found in exercises sheet: "${exerciseName}" — skipping row`
      );
      skipped++;
      continue;
    }

    let date: string;
    try {
      date = parseDate(rawDate);
    } catch (e) {
      console.warn(`  ⚠ Bad date "${rawDate}" — skipping row`);
      skipped++;
      continue;
    }

    const kgs = toFloat(row["Kgs"]);
    const lbs = toFloat(row["Lbs"]);
    let measure: string | null = null;
    let value: number | null = null;
    if (kgs !== null) {
      measure = "kg";
      value = kgs;
    } else if (lbs !== null) {
      measure = "lbs";
      value = lbs;
    }

    await db.insert(sets).values({
      date,
      block: row["Block"]?.trim() ?? "",
      week: toInt(row["Week"]) ?? 0,
      exerciseId,
      planned: toFloat(row["Count"]),
      actual: toFloat(row["Actual"]),
      measure,
      value,
      notes: row["Notes"]?.trim() || null,
    });

    inserted++;
  }

  console.log(`Inserted ${inserted} sets. Skipped ${skipped} rows.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dataDir = resolve(process.cwd(), "scripts/data");

  const exercisesCSV = readFileSync(resolve(dataDir, "exercises.csv"), "utf8");
  const setsCSV = readFileSync(resolve(dataDir, "sets.csv"), "utf8");

  const exerciseRows = parseCSV(exercisesCSV);
  const setRows = parseCSV(setsCSV);

  console.log(
    `Parsed ${exerciseRows.length} exercise rows, ${setRows.length} set rows.`
  );

  const nameToId = await seedExercises(exerciseRows);
  await seedSets(setRows, nameToId);

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
