/**
 * Seed script: imports habit data from a CSV export.
 *
 * Usage:
 *   1. Place CSV → scripts/data/habits.csv
 *      Expected columns: Date, Mood, Work, Extra Cur, Exercise, Recreation, Peach,
 *        Socialise, Family, Sleep, Relax, Skin Care, Creatine, Stretch, Guitar,
 *        Read, Milktea X, MT Bought, Meditation, Magnesium, Notes
 *   2. Add Turso credentials to .env.local
 *   3. Run: npm run db:seed-habits
 *
 * - Mood values (-2 to 2) go into the thoughts table with type="mood"
 * - Notes go into the thoughts table with type="note"
 * - Exercise column is skipped (tracked separately in sets/exercises tables)
 * - Milktea X is used for milktea count; MT Bought is the fallback if Milktea X is blank
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { inArray } from "drizzle-orm";
import { habits, habitEntries, thoughts } from "../lib/schema";

import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env.local") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

const CHUNK = 50;

// ---------------------------------------------------------------------------
// Habit definitions
// ---------------------------------------------------------------------------

const HABIT_DEFINITIONS = [
  { key: "work",           label: "Work",           category: "work",          valueType: "scaled",  description: "How much I worked on my full-time job (0=none, 0.5=partial, 1=full)" },
  { key: "extracurricular",label: "Extracurricular", category: "work",          valueType: "scaled",  description: "How much I worked on non-full-time commitments" },
  { key: "recreation",     label: "Recreation",      category: "lifestyle",     valueType: "scaled",  description: "How much I participated in recreational activities" },
  { key: "wife",           label: "Wife",            category: "relationships", valueType: "scaled",  description: "Quality time spent with my wife" },
  { key: "socialise",      label: "Socialise",       category: "relationships", valueType: "scaled",  description: "How much I interacted with non-family friends" },
  { key: "family",         label: "Family",          category: "relationships", valueType: "scaled",  description: "How much I interacted with family" },
  { key: "sleep",          label: "Sleep",           category: "health",        valueType: "scaled",  description: "Quality of my sleep" },
  { key: "relax",          label: "Relax",           category: "health",        valueType: "scaled",  description: "Quality of relaxation (nap, low stress)" },
  { key: "skin_care",      label: "Skin Care",       category: "health",        valueType: "scaled",  description: "Ability to follow through with skin care routine" },
  { key: "creatine",       label: "Creatine",        category: "health",        valueType: "binary",  description: "Whether I took creatine" },
  { key: "stretch",        label: "Stretch",         category: "health",        valueType: "scaled",  description: "Whether I stretched or did yoga" },
  { key: "guitar",         label: "Guitar",          category: "hobbies",       valueType: "scaled",  description: "Whether I practiced guitar" },
  { key: "read",           label: "Read",            category: "hobbies",       valueType: "scaled",  description: "Whether I read" },
  { key: "milktea",        label: "Milk Tea",        category: "lifestyle",     valueType: "count",   description: "Number of milk teas consumed" },
  { key: "meditation",     label: "Meditation",      category: "health",        valueType: "scaled",  description: "How much I meditated" },
  { key: "magnesium",      label: "Magnesium",       category: "health",        valueType: "binary",  description: "Whether I took magnesium (the day before)" },
] as const;

const CSV_COL_TO_KEY: Record<string, string> = {
  "Work":       "work",
  "Extra Cur":  "extracurricular",
  "Recreation": "recreation",
  "Peach":      "wife",
  "Socialise":  "socialise",
  "Family":     "family",
  "Sleep":      "sleep",
  "Relax":      "relax",
  "Skin Care":  "skin_care",
  "Creatine":   "creatine",
  "Stretch":    "stretch",
  "Guitar":     "guitar",
  "Read":       "read",
  "Meditation": "meditation",
  "Magnesium":  "magnesium",
};

// ---------------------------------------------------------------------------
// CSV parser — auto-detects tab vs comma delimiter, handles quoted fields
// ---------------------------------------------------------------------------

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitLine(lines[0], delimiter).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === "\t") return line.split("\t");
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseDate(raw: string): string {
  if (!raw) throw new Error("Empty date");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  throw new Error(`Unrecognised date format: ${raw}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const csvPath = resolve(process.cwd(), "scripts/data/habits.csv");
  const rows = parseCSV(readFileSync(csvPath, "utf8"));
  console.log(`Parsed ${rows.length} CSV rows.`);

  // Upsert habit definitions
  const existingHabits = await db.select().from(habits);
  const existingKeys = new Set(existingHabits.map((h) => h.key));
  const toInsert = HABIT_DEFINITIONS.filter((d) => !existingKeys.has(d.key));
  if (toInsert.length) {
    await db.insert(habits).values(toInsert.map((d) => ({
      key: d.key, label: d.label, description: d.description,
      category: d.category, valueType: d.valueType, isActive: true,
    })));
  }
  console.log(`Habits: ${toInsert.length} inserted, ${existingKeys.size} already existed.`);

  // Build key → id map
  const allHabits = await db.select().from(habits);
  const keyToId = new Map<string, number>();
  for (const h of allHabits) keyToId.set(h.key, h.id);

  // Pre-fetch existing data in bulk (one query each)
  const [existingEntries, existingThoughtRows] = await Promise.all([
    db.select({ date: habitEntries.date, habitId: habitEntries.habitId }).from(habitEntries),
    db.select({ entryDate: thoughts.entryDate, type: thoughts.type })
      .from(thoughts)
      .where(inArray(thoughts.type, ["mood", "note"])),
  ]);

  const entrySet = new Set(existingEntries.map((e) => `${e.date}|${e.habitId}`));
  const thoughtSet = new Set(existingThoughtRows.map((t) => `${t.entryDate}|${t.type}`));

  type NewEntry = { date: string; habitId: number; numericValue: number };
  type NewThought = { entryDate: string; thought: string; type: string };
  const newEntries: NewEntry[] = [];
  const newThoughts: NewThought[] = [];
  let rowsSkipped = 0;

  for (const row of rows) {
    const rawDate = row["Date"]?.trim();
    if (!rawDate) { rowsSkipped++; continue; }

    let date: string;
    try {
      date = parseDate(rawDate);
    } catch {
      console.warn(`  ⚠ Bad date "${rawDate}" — skipping`);
      rowsSkipped++;
      continue;
    }

    const mood = row["Mood"]?.trim();
    if (mood && !thoughtSet.has(`${date}|mood`)) {
      newThoughts.push({ entryDate: date, thought: mood, type: "mood" });
      thoughtSet.add(`${date}|mood`);
    }

    const note = row["Notes"]?.trim();
    if (note && !thoughtSet.has(`${date}|note`)) {
      newThoughts.push({ entryDate: date, thought: note, type: "note" });
      thoughtSet.add(`${date}|note`);
    }

    const milkteaRaw = row["Milktea X"]?.trim() || row["MT Bought"]?.trim();
    if (milkteaRaw) {
      const val = parseFloat(milkteaRaw);
      const habitId = keyToId.get("milktea");
      if (!isNaN(val) && habitId !== undefined && !entrySet.has(`${date}|${habitId}`)) {
        newEntries.push({ date, habitId, numericValue: val });
        entrySet.add(`${date}|${habitId}`);
      }
    }

    for (const [col, key] of Object.entries(CSV_COL_TO_KEY)) {
      const raw = row[col]?.trim();
      if (!raw) continue;
      const val = parseFloat(raw);
      if (isNaN(val)) continue;
      const habitId = keyToId.get(key);
      if (habitId === undefined) continue;
      if (!entrySet.has(`${date}|${habitId}`)) {
        newEntries.push({ date, habitId, numericValue: val });
        entrySet.add(`${date}|${habitId}`);
      }
    }
  }

  // Batch insert
  let entriesInserted = 0;
  for (let i = 0; i < newEntries.length; i += CHUNK) {
    const res = await db.insert(habitEntries).values(newEntries.slice(i, i + CHUNK)).onConflictDoNothing();
    entriesInserted += res.rowsAffected;
  }

  let thoughtsInserted = 0;
  for (let i = 0; i < newThoughts.length; i += CHUNK) {
    const res = await db.insert(thoughts).values(newThoughts.slice(i, i + CHUNK));
    thoughtsInserted += res.rowsAffected;
  }

  console.log(`\nDone.`);
  console.log(`  Habit entries inserted: ${entriesInserted}`);
  console.log(`  Thoughts inserted:      ${thoughtsInserted}`);
  console.log(`  Rows skipped:           ${rowsSkipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
