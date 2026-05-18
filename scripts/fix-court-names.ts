/**
 * One-shot migration: sets courtNumber for rows where toInt() silently dropped
 * text values (terracotta, black, blue, Nox Stadium, parking).
 *
 * Run: npx tsx scripts/fix-court-names.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { and, eq } from "drizzle-orm";
import { padelSets } from "../lib/schema";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env.local") });

function splitCSVLine(line: string): string[] {
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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    rows.push(row);
  }
  return rows;
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

const csvPath = resolve(__dirname, "data/padel_matches.csv");
const rows = parseCSV(readFileSync(csvPath, "utf-8"));

const toFix = rows.filter(
  (r) => r.court_number && !/^\d+$/.test(r.court_number),
);

console.log(`Rows to update: ${toFix.length}`);

async function run() {
  let updated = 0;
  for (const row of toFix) {
    const result = await db
      .update(padelSets)
      .set({ courtNumber: row.court_number })
      .where(
        and(
          eq(padelSets.matchId, Number(row.match_id)),
          eq(padelSets.setNumber, Number(row.set_number)),
        ),
      )
      .returning({ id: padelSets.id });

    if (result.length > 0) {
      updated++;
      console.log(`  ✓ match ${row.match_id} set ${row.set_number} → "${row.court_number}"`);
    } else {
      console.warn(`  ✗ NOT FOUND: match ${row.match_id} set ${row.set_number}`);
    }
  }
  console.log(`\nDone. Updated ${updated} / ${toFix.length} rows.`);
}

run().catch(console.error).finally(() => client.close());
