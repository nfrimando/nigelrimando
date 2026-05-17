import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'reps' | 'seconds' | 'distance' | etc.
  primaryTarget: text("primary_target").notNull(),
  secondaryTarget: text("secondary_target"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export const sets = sqliteTable("sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  block: text("block").notNull(),
  week: integer("week").notNull(),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercises.id),
  planned: real("planned"),
  actual: real("actual"),
  measure: text("measure"), // 'kg' | 'lbs' | 'km' | 'reps' | 'seconds' | etc.
  value: real("value"), // numeric weight/load/distance value
  notes: text("notes"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;
