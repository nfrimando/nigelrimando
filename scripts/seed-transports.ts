/**
 * Seed script: imports transport log (ebike trips + charging events) from CSV.
 *
 * Usage:
 *   1. Place CSV → scripts/data/trips.csv
 *      Expected columns: Date, Event, From, To, Time Start, Time End, Notes
 *      (Waze Estimate and Duration columns are ignored)
 *   2. Add Turso credentials to .env.local
 *   3. Run: npm run db:seed-transports
 *
 * Event mapping:
 *   "Travel"         → event_type="trip",     mode="ebike", item="ebike"
 *   "Charge" + notes contains "helmet" (case-insensitive)
 *                    → event_type="charging",  mode="ebike", item="helmet"
 *   "Charge" (other) → event_type="charging",  mode="ebike", item="ebike"
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { transports } from "../lib/schema";
import type { NewTransport } from "../lib/schema";

import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env.local") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields with embedded commas
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

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

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

// Normalises "8:00 AM", "08:00", "8:00" → "HH:MM" (24h)
function parseTime(raw: string): string | null {
  if (!raw) return null;
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2];
    const meridiem = ampm[3].toUpperCase();
    if (meridiem === "AM" && h === 12) h = 0;
    if (meridiem === "PM" && h !== 12) h += 12;
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    return `${hhmm[1].padStart(2, "0")}:${hhmm[2]}`;
  }
  console.warn(`  ⚠ Unrecognised time format: "${raw}" — stored as null`);
  return null;
}

function mapRow(row: Record<string, string>): NewTransport | null {
  const event = row["Event"]?.trim();
  const notes = row["Notes"]?.trim() ?? "";

  let eventType: string;
  let mode: string;
  let item: string;

  if (event === "Travel") {
    eventType = "trip";
    mode = "ebike";
    item = "ebike";
  } else if (event === "Charge") {
    eventType = "charging";
    mode = "ebike";
    item = notes.toLowerCase().includes("helmet") ? "helmet" : "ebike";
  } else {
    console.warn(`  ⚠ Unknown event "${event}" — skipping row`);
    return null;
  }

  return {
    date: "", // filled by caller after date parsing
    startTime: parseTime(row["Time Start"]),
    endTime: parseTime(row["Time End"]),
    eventType,
    mode,
    item,
    origin: row["From"]?.trim() || null,
    destination: row["To"]?.trim() || null,
    notes: notes || null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const csvPath = resolve(process.cwd(), "scripts/data/trips.csv");
  const rows = parseCSV(readFileSync(csvPath, "utf8"));
  console.log(`Parsed ${rows.length} rows from trips.csv`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const rawDate = row["Date"]?.trim();
    if (!rawDate) { skipped++; continue; }

    let date: string;
    try {
      date = parseDate(rawDate);
    } catch {
      console.warn(`  ⚠ Bad date "${rawDate}" — skipping row`);
      skipped++;
      continue;
    }

    const record = mapRow(row);
    if (!record) { skipped++; continue; }

    record.date = date;
    await db.insert(transports).values(record);
    inserted++;
  }

  console.log(`\nDone.`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
