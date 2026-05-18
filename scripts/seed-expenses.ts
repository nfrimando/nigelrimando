import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { expenses } from "../lib/schema";
import type { NewExpense } from "../lib/schema";

import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env.local") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

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

function mapRow(row: Record<string, string>): NewExpense {
  return {
    date: parseDate(row["date"]),
    category: row["category"],
    subcategory: row["subcategory"] || null,
    item: row["item"],
    amount: parseFloat(row["amount"]),
    shop: row["shop"] || null,
    month: row["month"] || null,
    notes: row["notes"] || null,
  };
}

async function main() {
  const csvPath = resolve(process.cwd(), "scripts/data/expenses.csv");
  const rows = parseCSV(readFileSync(csvPath, "utf8"));
  console.log(`Parsed ${rows.length} rows from expenses.csv`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row["date"] || !row["item"] || !row["amount"]) {
      console.warn(`  ⚠ Missing required field — skipping: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    let record: NewExpense;
    try {
      record = mapRow(row);
    } catch (err) {
      console.warn(`  ⚠ ${(err as Error).message} — skipping row`);
      skipped++;
      continue;
    }

    await db.insert(expenses).values(record);
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
