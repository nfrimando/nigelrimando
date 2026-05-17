/**
 * Seed script: imports persons and padel match history from CSV exports.
 *
 * Usage:
 *   1. Place names CSV → scripts/data/persons.csv
 *      Expected columns: name
 *   2. Place match CSV → scripts/data/padel_matches.csv
 *      Expected columns: date, match_id, set_number, teammate_left, teammate_right,
 *                        opponent_left, opponent_right, points_won, points_lost,
 *                        format, venue, court_number
 *   3. Add Turso credentials to .env.local
 *   4. Run: npx tsx scripts/seed-padel.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import * as readline from "readline";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { persons, padelSets } from "../lib/schema";

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

function toInt(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function parseDate(raw: string): string {
  if (!raw) throw new Error("Empty date value");
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

const PLAYER_COLS = ["teammate_left", "teammate_right", "opponent_left", "opponent_right"] as const;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string) => new Promise<string>((res) => rl.question(q, res));

// ---------------------------------------------------------------------------
// Phase 1: resolve all persons (persons.csv + match CSV player names)
// ---------------------------------------------------------------------------

/**
 * Builds a complete name→id map by:
 *  1. Loading existing persons from DB
 *  2. Auto-inserting new names from persons.csv
 *  3. Scanning match rows for unknown player names and prompting for each
 *
 * Returns nameToId and the set of lowercased names to skip during match seeding.
 */
async function resolveAllPersons(
  personRows: Record<string, string>[],
  matchRows: Record<string, string>[]
): Promise<{ nameToId: Map<string, number>; skipNames: Set<string> }> {
  const nameToId = new Map<string, number>();

  // Load existing persons
  const existing = await db.select().from(persons);
  for (const p of existing) {
    nameToId.set(p.name.toLowerCase(), p.id);
  }

  let inserted = 0;

  // Auto-insert names from persons.csv that aren't in DB yet
  const personsField = personRows.length > 0 ? Object.keys(personRows[0])[0] : "name";
  for (const row of personRows) {
    const name = row[personsField]?.trim();
    if (!name || nameToId.has(name.toLowerCase())) continue;
    const result = await db.insert(persons).values({ name }).returning({ id: persons.id });
    nameToId.set(name.toLowerCase(), result[0].id);
    inserted++;
  }

  // Collect unknown player names from match CSV
  const unknown = new Set<string>();
  for (const row of matchRows) {
    for (const col of PLAYER_COLS) {
      const name = row[col]?.trim();
      if (name && !nameToId.has(name.toLowerCase())) unknown.add(name);
    }
  }

  const skipNames = new Set<string>();

  if (unknown.size > 0) {
    console.log(`\n${unknown.size} player name(s) in the match CSV are not in the persons table:`);

    for (const name of unknown) {
      const knownList = [...nameToId.keys()]
        .map((k) => existing.find((p) => p.name.toLowerCase() === k)?.name ?? k)
        .join(", ");

      console.log(`\n  Unknown: "${name}"`);
      console.log(`  Known persons: ${knownList || "(none)"}`);
      console.log(`    [Enter]          → add "${name}" as a new person`);
      console.log(`    [existing name]  → map "${name}" to that person`);
      console.log(`    skip             → skip all rows containing "${name}"`);

      const answer = (await ask("  > ")).trim();

      if (answer === "") {
        const result = await db.insert(persons).values({ name }).returning({ id: persons.id });
        nameToId.set(name.toLowerCase(), result[0].id);
        inserted++;
        console.log(`  ✓ Added "${name}" (id=${result[0].id})`);
      } else if (answer.toLowerCase() === "skip") {
        skipNames.add(name.toLowerCase());
        console.log(`  — Will skip rows with "${name}"`);
      } else {
        const mapped = nameToId.get(answer.toLowerCase());
        if (mapped === undefined) {
          console.log(`  ✗ "${answer}" not found — skipping "${name}" instead`);
          skipNames.add(name.toLowerCase());
        } else {
          nameToId.set(name.toLowerCase(), mapped);
          console.log(`  ✓ Mapped "${name}" → "${answer}" (id=${mapped})`);
        }
      }
    }
  }

  console.log(
    `\nPersons: ${inserted} inserted, ${nameToId.size} total, ${skipNames.size} skipped.`
  );
  return { nameToId, skipNames };
}

// ---------------------------------------------------------------------------
// Phase 2: seed padel_matches
// ---------------------------------------------------------------------------

async function seedPadelMatches(
  rows: Record<string, string>[],
  nameToId: Map<string, number>,
  skipNames: Set<string>
): Promise<void> {
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const rawDate = row["date"]?.trim();
    if (!rawDate) { skipped++; continue; }

    let date: string;
    try {
      date = parseDate(rawDate);
    } catch {
      console.warn(`  ⚠ Bad date "${rawDate}" — skipping row`);
      skipped++;
      continue;
    }

    const playerIds: Record<string, number> = {};
    let skip = false;

    for (const col of PLAYER_COLS) {
      const name = row[col]?.trim();
      if (!name) {
        console.warn(`  ⚠ Empty player "${col}" on ${rawDate} — skipping`);
        skip = true;
        break;
      }
      if (skipNames.has(name.toLowerCase())) { skip = true; break; }
      const id = nameToId.get(name.toLowerCase());
      if (id === undefined) {
        console.warn(`  ⚠ Person not found: "${name}" — skipping row`);
        skip = true;
        break;
      }
      playerIds[col] = id;
    }

    if (skip) { skipped++; continue; }

    const matchId   = toInt(row["match_id"]);
    const setNumber = toInt(row["set_number"]);
    const gamesWon  = toInt(row["points_won"]);
    const gamesLost = toInt(row["points_lost"]);

    if (matchId === null || setNumber === null || gamesWon === null || gamesLost === null) {
      console.warn(`  ⚠ Missing required numeric field on ${rawDate} — skipping`);
      skipped++;
      continue;
    }

    await db.insert(padelSets).values({
      date,
      matchId,
      setNumber,
      teammateLeft:  playerIds["teammate_left"],
      teammateRight: playerIds["teammate_right"],
      opponentLeft:  playerIds["opponent_left"],
      opponentRight: playerIds["opponent_right"],
      gamesWon,
      gamesLost,
      format:      row["format"]?.trim() || null,
      venue:       row["venue"]?.trim() || null,
      courtNumber: toInt(row["court_number"]),
    });

    inserted++;
  }

  console.log(`Matches: ${inserted} inserted, ${skipped} skipped.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dataDir = resolve(process.cwd(), "scripts/data");

  const personsCSV = readFileSync(resolve(dataDir, "persons.csv"), "utf8");
  const matchesCSV = readFileSync(resolve(dataDir, "padel_matches.csv"), "utf8");

  const personRows = parseCSV(personsCSV);
  const matchRows  = parseCSV(matchesCSV);

  console.log(`Parsed ${personRows.length} person rows, ${matchRows.length} match rows.`);

  const { nameToId, skipNames } = await resolveAllPersons(personRows, matchRows);
  rl.close();

  await seedPadelMatches(matchRows, nameToId, skipNames);

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
