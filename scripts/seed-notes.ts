/**
 * Backfills only the Notes column from habits.csv into the thoughts table.
 * Safe to re-run: skips dates that already have a note entry.
 *
 * Usage: npm run db:seed-notes
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { thoughts } from "../lib/schema";

import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env.local") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

const CHUNK = 50;

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  throw new Error(`Unrecognised date: ${raw}`);
}

async function main() {
  const csvPath = resolve(process.cwd(), "scripts/data/habits.csv");
  const rows = parseCSV(readFileSync(csvPath, "utf8"));
  console.log(`Parsed ${rows.length} CSV rows.`);

  // Load all existing note entries in one query
  const existing = await db.select({ entryDate: thoughts.entryDate })
    .from(thoughts)
    .where(eq(thoughts.type, "note"));
  const existingDates = new Set(existing.map((t) => t.entryDate));
  console.log(`Existing notes in DB: ${existingDates.size}`);

  const toInsert: { entryDate: string; thought: string; type: string }[] = [];
  let skipped = 0;

  for (const row of rows) {
    const rawDate = row["Date"]?.trim();
    const note = row["Notes"]?.trim();
    if (!rawDate || !note) continue;

    let date: string;
    try { date = parseDate(rawDate); }
    catch { console.warn(`  ⚠ Bad date "${rawDate}" — skipping`); continue; }

    if (existingDates.has(date)) { skipped++; continue; }

    toInsert.push({ entryDate: date, thought: note, type: "note" });
    existingDates.add(date); // prevent CSV-internal dupes
  }

  console.log(`To insert: ${toInsert.length}, already exist: ${skipped}`);

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const res = await db.insert(thoughts).values(toInsert.slice(i, i + CHUNK));
    inserted += res.rowsAffected;
    process.stdout.write(`\r  Inserted ${inserted}/${toInsert.length}...`);
  }

  console.log(`\nDone. Inserted ${inserted} notes.`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
