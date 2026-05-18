/**
 * Seed script: imports journal data (thoughts + interactions) from a CSV export.
 *
 * Usage:
 *   1. Place CSV → scripts/data/journal.csv
 *      Expected columns: Date, Rank 1, Rank 2, Rank 3, Rank 4, Rank 5, Main take away, Notes
 *      (tab-separated or comma-separated — auto-detected)
 *   2. Add Turso credentials to .env.local
 *   3. Run: npm run db:seed-journal
 *
 * Persons must already exist in the persons table. Unknown names are warned and skipped.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { persons, thoughts, interactions } from "../lib/schema";

import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env.local") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

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

const RANK_COLS = ["Rank 1", "Rank 2", "Rank 3", "Rank 4", "Rank 5"] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const csvPath = resolve(process.cwd(), "scripts/data/journal.csv");
  const rows = parseCSV(readFileSync(csvPath, "utf8"));
  console.log(`Parsed ${rows.length} journal rows.`);

  // Build name→id map from existing persons
  const existingPersons = await db.select().from(persons);
  const nameToId = new Map<string, number>();
  for (const p of existingPersons) {
    nameToId.set(p.name.toLowerCase(), p.id);
  }
  console.log(`Loaded ${existingPersons.length} persons from DB.`);

  let thoughtsInserted = 0;
  let interactionsInserted = 0;
  let interactionsSkipped = 0;
  const unknownNames = new Set<string>();

  for (const row of rows) {
    const rawDate = row["Date"]?.trim();
    if (!rawDate) continue;

    let entryDate: string;
    try {
      entryDate = parseDate(rawDate);
    } catch {
      console.warn(`  ⚠ Bad date "${rawDate}" — skipping row`);
      continue;
    }

    // Thoughts: insert one row per non-empty value across "Main take away" and "Notes"
    const thoughtCols = ["Main take away", "Notes"];
    for (const col of thoughtCols) {
      const text = row[col]?.trim();
      if (!text) continue;
      await db.insert(thoughts).values({ entryDate, thought: text, type: null });
      thoughtsInserted++;
    }

    // Interactions: one row per non-empty rank column
    for (let i = 0; i < RANK_COLS.length; i++) {
      const col = RANK_COLS[i];
      const name = row[col]?.trim();
      if (!name) continue;

      const personId = nameToId.get(name.toLowerCase());
      if (personId === undefined) {
        unknownNames.add(name);
        interactionsSkipped++;
        continue;
      }

      await db.insert(interactions).values({
        entryDate,
        personId,
        rank: i + 1,
        note: null,
        sentiment: null,
      });
      interactionsInserted++;
    }
  }

  if (unknownNames.size > 0) {
    console.warn(`\n⚠ Unknown person names (not in persons table) — rows skipped:`);
    for (const n of unknownNames) console.warn(`  - "${n}"`);
  }

  console.log(`\nDone.`);
  console.log(`  Thoughts inserted:     ${thoughtsInserted}`);
  console.log(`  Interactions inserted: ${interactionsInserted}`);
  console.log(`  Interactions skipped:  ${interactionsSkipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
