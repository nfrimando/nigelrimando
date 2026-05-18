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

export const persons = sqliteTable("persons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  nickname: text("nickname"),
  imageUrl: text("image_url"),
});

export const padelSets = sqliteTable("padel_sets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  matchId: integer("match_id").notNull(),
  setNumber: integer("set_number").notNull(),
  teammateLeft: integer("teammate_left")
    .notNull()
    .references(() => persons.id),
  teammateRight: integer("teammate_right")
    .notNull()
    .references(() => persons.id),
  opponentLeft: integer("opponent_left")
    .notNull()
    .references(() => persons.id),
  opponentRight: integer("opponent_right")
    .notNull()
    .references(() => persons.id),
  gamesWon: integer("games_won").notNull(),
  gamesLost: integer("games_lost").notNull(),
  format: text("format"),
  venue: text("venue"),
  courtNumber: integer("court_number"),
  videoUrl: text("video_url"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type PadelSet = typeof padelSets.$inferSelect;
export type NewPadelSet = typeof padelSets.$inferInsert;

export const thoughts = sqliteTable("thoughts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryDate: text("entry_date").notNull(),
  thought: text("thought").notNull(),
  type: text("type"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export const interactions = sqliteTable("interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryDate: text("entry_date").notNull(),
  personId: integer("person_id").references(() => persons.id),
  rank: integer("rank"),
  note: text("note"),
  sentiment: integer("sentiment"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Thought = typeof thoughts.$inferSelect;
export type NewThought = typeof thoughts.$inferInsert;
export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;

export const transports = sqliteTable("transports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  startTime: text("start_time"),
  endTime: text("end_time"),
  eventType: text("event_type").notNull(), // 'trip' | 'charging'
  mode: text("mode"), // 'ebike'
  item: text("item"), // 'ebike' | 'helmet'
  origin: text("origin"),
  destination: text("destination"),
  notes: text("notes"),
  videoUrl: text("video_url"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Transport = typeof transports.$inferSelect;
export type NewTransport = typeof transports.$inferInsert;
