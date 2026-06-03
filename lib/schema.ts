import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
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

export const sets = sqliteTable(
  "sets",
  {
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
    setOrder: integer("set_order"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("idx_sets_date").on(t.date),
    index("idx_sets_exercise_id").on(t.exerciseId),
  ],
);

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

export const padelSets = sqliteTable(
  "padel_sets",
  {
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
    courtNumber: text("court_number"),
    videoUrl: text("video_url"),
    notes: text("notes"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("idx_padel_sets_date").on(t.date),
    index("idx_padel_sets_match_id_set").on(t.matchId, t.setNumber),
    index("idx_padel_sets_teammate_left").on(t.teammateLeft),
    index("idx_padel_sets_teammate_right").on(t.teammateRight),
    index("idx_padel_sets_opponent_left").on(t.opponentLeft),
    index("idx_padel_sets_opponent_right").on(t.opponentRight),
  ],
);

export type Person = typeof persons.$inferSelect;
export type NewPerson = typeof persons.$inferInsert;
export type PadelSet = typeof padelSets.$inferSelect;
export type NewPadelSet = typeof padelSets.$inferInsert;

export const thoughts = sqliteTable(
  "thoughts",
  {
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
  },
  (t) => [index("idx_thoughts_entry_date").on(t.entryDate)],
);

export const interactions = sqliteTable(
  "interactions",
  {
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
  },
  (t) => [
    index("idx_interactions_entry_date").on(t.entryDate),
    index("idx_interactions_person_id").on(t.personId),
  ],
);

export type Thought = typeof thoughts.$inferSelect;
export type NewThought = typeof thoughts.$inferInsert;
export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;

export const transports = sqliteTable(
  "transports",
  {
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
  },
  (t) => [
    index("idx_transports_date").on(t.date),
    index("idx_transports_event_type_mode").on(t.eventType, t.mode),
  ],
);

export type Transport = typeof transports.$inferSelect;
export type NewTransport = typeof transports.$inferInsert;

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(), // 'YYYY-MM-DD'
    category: text("category").notNull(),
    subcategory: text("subcategory"),
    item: text("item").notNull(),
    amount: real("amount").notNull(),
    shop: text("shop"),
    month: text("month"),
    notes: text("notes"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("idx_expenses_date").on(t.date),
    index("idx_expenses_category").on(t.category),
  ],
);

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'work' | 'health' | 'relationships' | 'hobbies' | 'lifestyle'
  valueType: text("value_type").notNull(), // 'binary' | 'scaled' | 'count'
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export const habitEntries = sqliteTable(
  "habit_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    date: text("date").notNull(), // 'YYYY-MM-DD'
    habitId: integer("habit_id")
      .notNull()
      .references(() => habits.id),
    numericValue: real("numeric_value"), // 0, 0.5, 1, 2 etc.
    textValue: text("text_value"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index("idx_habit_entries_date").on(t.date),
    index("idx_habit_entries_habit_id").on(t.habitId),
    uniqueIndex("idx_habit_entries_date_habit").on(t.date, t.habitId),
  ],
);

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitEntry = typeof habitEntries.$inferSelect;
export type NewHabitEntry = typeof habitEntries.$inferInsert;

export const visitorMessages = sqliteTable("visitor_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  message: text("message").notNull(),
  senderHandle: text("sender_handle"),
  reply: text("reply"),
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export type VisitorMessage = typeof visitorMessages.$inferSelect;
export type NewVisitorMessage = typeof visitorMessages.$inferInsert;
