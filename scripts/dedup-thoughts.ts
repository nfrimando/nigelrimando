/**
 * Deletes thoughts rows inserted in the last 12 hours.
 * Use this to roll back a bad seed run.
 *
 * Usage: npm run db:dedup-thoughts
 */

import { resolve } from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { and, gt, isNull } from "drizzle-orm";
import { thoughts } from "../lib/schema";

import { config } from "dotenv";
config({ path: resolve(process.cwd(), ".env.local") });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

async function main() {
  const cutoff = Math.floor(Date.now() / 1000) - 12 * 60 * 60;

  const condition = and(gt(thoughts.createdAt, cutoff), isNull(thoughts.type));

  const toDelete = await db.select({ id: thoughts.id, entryDate: thoughts.entryDate, type: thoughts.type })
    .from(thoughts)
    .where(condition);

  if (toDelete.length === 0) {
    console.log("No null-type thoughts rows inserted in the last 12 hours.");
    process.exit(0);
  }

  console.log(`Deleting ${toDelete.length} rows inserted after ${new Date(cutoff * 1000).toISOString()}:`);
  for (const row of toDelete) {
    console.log(`  id=${row.id}  date=${row.entryDate}  type=${row.type}`);
  }

  await db.delete(thoughts).where(condition);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
