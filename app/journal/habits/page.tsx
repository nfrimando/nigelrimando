export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { habits, habitEntries } from "@/lib/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import HabitSelector from "./HabitSelector";

function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

function windowStart12Months(today: string): string {
  const [y, m] = today.split("-").map(Number);
  const wm = m - 11;
  const wy = wm <= 0 ? y - 1 : y;
  const wMonth = wm <= 0 ? wm + 12 : wm;
  return `${wy}-${String(wMonth).padStart(2, "0")}-01`;
}

function diffDays(later: string, earlier: string): number {
  const [ay, am, ad] = later.split("-").map(Number);
  const [by, bm, bd] = earlier.split("-").map(Number);
  return Math.round(
    (new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime()) / 86_400_000,
  );
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ACCENT = "#4E6877";
const ACCENT_RGB = "78, 104, 119";
const EMPTY_BG = "#EFE8DF";
const EMPTY_BORDER = "1px solid #D5CBBF";

function cellColor(numericValue: number | null, valueType: string): { bg: string; border?: string } {
  if (numericValue === null || numericValue === undefined) {
    return { bg: EMPTY_BG, border: EMPTY_BORDER };
  }

  if (valueType === "binary") {
    return numericValue >= 1
      ? { bg: ACCENT }
      : { bg: EMPTY_BG, border: EMPTY_BORDER };
  }

  if (valueType === "scaled") {
    if (numericValue <= 0) return { bg: EMPTY_BG, border: EMPTY_BORDER };
    if (numericValue <= 0.25) return { bg: `rgba(${ACCENT_RGB}, 0.25)` };
    if (numericValue <= 0.5) return { bg: `rgba(${ACCENT_RGB}, 0.5)` };
    if (numericValue <= 0.75) return { bg: `rgba(${ACCENT_RGB}, 0.75)` };
    return { bg: ACCENT };
  }

  // count
  if (numericValue <= 0) return { bg: EMPTY_BG, border: EMPTY_BORDER };
  if (numericValue === 1) return { bg: `rgba(${ACCENT_RGB}, 0.35)` };
  if (numericValue === 2) return { bg: `rgba(${ACCENT_RGB}, 0.65)` };
  return { bg: ACCENT };
}

function cellTitle(date: string, numericValue: number | null, valueType: string): string {
  if (numericValue === null) return date;
  if (valueType === "binary") return `${date} · ${numericValue >= 1 ? "done" : "skipped"}`;
  if (valueType === "scaled") return `${date} · ${numericValue}`;
  return `${date} · ${numericValue}`;
}

const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function MonthBlock({
  year,
  month,
  entryMap,
  valueType,
  windowStart,
  windowEnd,
}: {
  year: number;
  month: number;
  entryMap: Map<string, number | null>;
  valueType: string;
  windowStart: string;
  windowEnd: string;
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon-based offset
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });

  // Pad cells to Mon-aligned grid
  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <p className="text-[11px] font-mono font-medium text-[var(--text-muted)] uppercase tracking-widest mb-2">
        {monthName} {year}
      </p>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {DOW_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[9px] text-[var(--text-muted)] font-mono leading-4">
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const inWindow = dateStr >= windowStart && dateStr <= windowEnd;
          if (!inWindow) return <div key={dateStr} className="aspect-square rounded-[3px]" />;
          const val = entryMap.get(dateStr) ?? null;
          const isToday = dateStr === windowEnd;
          const { bg, border } = cellColor(val, valueType);
          return (
            <div
              key={dateStr}
              title={cellTitle(dateStr, val, valueType)}
              className="aspect-square rounded-[3px]"
              style={{
                backgroundColor: bg,
                border,
                boxShadow: isToday ? "inset 0 0 0 1.5px #171A1F" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function CalendarGrid({
  entries,
  valueType,
  today,
  windowStart,
}: {
  entries: { date: string; numericValue: number | null }[];
  valueType: string;
  today: string;
  windowStart: string;
}) {
  const entryMap = new Map<string, number | null>(entries.map((e) => [e.date, e.numericValue]));

  const [sy, sm] = windowStart.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);

  const months: { year: number; month: number }[] = [];
  let y = sy, m = sm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  months.reverse();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
      {months.map(({ year, month }) => (
        <MonthBlock
          key={`${year}-${month}`}
          year={year}
          month={month}
          entryMap={entryMap}
          valueType={valueType}
          windowStart={windowStart}
          windowEnd={today}
        />
      ))}
    </div>
  );
}

function Legend({ valueType }: { valueType: string }) {
  const swatches =
    valueType === "binary"
      ? [
          { bg: EMPTY_BG, border: EMPTY_BORDER, label: "skipped" },
          { bg: ACCENT, label: "done" },
        ]
      : valueType === "scaled"
        ? [
            { bg: EMPTY_BG, border: EMPTY_BORDER },
            { bg: `rgba(${ACCENT_RGB}, 0.25)` },
            { bg: `rgba(${ACCENT_RGB}, 0.5)` },
            { bg: `rgba(${ACCENT_RGB}, 0.75)` },
            { bg: ACCENT },
          ]
        : [
            { bg: EMPTY_BG, border: EMPTY_BORDER },
            { bg: `rgba(${ACCENT_RGB}, 0.35)` },
            { bg: `rgba(${ACCENT_RGB}, 0.65)` },
            { bg: ACCENT },
          ];

  const endLabel = valueType === "binary" ? null : valueType === "scaled" ? "Full" : "3+";

  return (
    <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
      <span>{valueType === "binary" ? "Skipped" : "None"}</span>
      <div className="flex gap-1">
        {swatches.map((s, i) => (
          <div
            key={i}
            style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: s.bg, border: s.border }}
          />
        ))}
      </div>
      {endLabel && <span>{endLabel}</span>}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5">
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className="font-heading font-bold text-2xl text-[var(--text)] leading-none">{value}</p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1.5">{sub}</p>}
    </div>
  );
}

export default async function HabitsJournalPage({
  searchParams,
}: {
  searchParams: Promise<{ habit?: string }>;
}) {
  const { habit } = await searchParams;

  const today = todayPH();
  const start365 = windowStart12Months(today);

  // All queries in parallel
  const publicHabits = await db
    .select()
    .from(habits)
    .where(eq(habits.isPublic, true))
    .orderBy(asc(habits.label));

  const habitId = (() => {
    const parsed = Number(habit ?? "14");
    if (publicHabits.find((h) => h.id === parsed)) return parsed;
    return publicHabits[0]?.id ?? 14;
  })();

  const selectedHabit = publicHabits.find((h) => h.id === habitId) ?? null;

  if (!selectedHabit) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:py-12">
        <div className="max-w-[760px] mx-auto">
          <a href="/" className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">← Home</a>
          <p className="mt-8 text-[var(--text-muted)]">No habits configured for this page yet.</p>
        </div>
      </div>
    );
  }

  const [calendarEntries, firstEntryRows] = await Promise.all([
    db
      .select({ date: habitEntries.date, numericValue: habitEntries.numericValue })
      .from(habitEntries)
      .where(
        and(
          eq(habitEntries.habitId, habitId),
          gte(habitEntries.date, start365),
          lte(habitEntries.date, today),
        ),
      )
      .orderBy(asc(habitEntries.date)),
    db
      .select({ date: habitEntries.date })
      .from(habitEntries)
      .where(eq(habitEntries.habitId, habitId))
      .orderBy(asc(habitEntries.date))
      .limit(1),
  ]);

  const daysLogged365 = calendarEntries.filter((e) => (e.numericValue ?? 0) > 0).length;
  const firstEntryDate = firstEntryRows[0]?.date ?? null;
  const lastEntryDate = calendarEntries.filter((e) => (e.numericValue ?? 0) > 0).at(-1)?.date ?? null;

  let daysSinceLast: number | null = null;
  if (lastEntryDate) {
    daysSinceLast = diffDays(today, lastEntryDate);
  }


  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-8 sm:py-12">
      <div className="max-w-[760px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div>
          <a
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            ← Home
          </a>
          <h1 className="font-heading font-bold text-2xl text-[var(--text)] mt-3">
            Habits
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Daily tracking, one habit at a time.
          </p>
        </div>

        {/* Habit selector */}
        <HabitSelector
          habits={publicHabits.map((h) => ({ id: h.id, label: h.label }))}
          selectedId={habitId}
        />

        {/* Selected habit description */}
        {selectedHabit.description && (
          <p className="text-sm text-[var(--text-muted)] -mt-4">{selectedHabit.description}</p>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Logged (12mo)"
            value={daysLogged365.toLocaleString()}
            sub="days"
          />
          <StatCard
            label="First entry"
            value={firstEntryDate ? formatShortDate(firstEntryDate) : "—"}
          />
          <StatCard
            label="Last entry"
            value={lastEntryDate ? formatShortDate(lastEntryDate) : "—"}
          />
          <StatCard
            label="Days since last"
            value={
              daysSinceLast === null
                ? "—"
                : daysSinceLast === 0
                  ? "Today"
                  : `${daysSinceLast}d`
            }
          />
        </div>

        {/* Calendar */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest">
              {selectedHabit.label} · last 12 months
            </p>
            <span className="text-[10px] font-mono text-[var(--text-muted)] capitalize">
              {selectedHabit.valueType}
            </span>
          </div>

          <div className="mb-4">
            <Legend valueType={selectedHabit.valueType} />
          </div>

          <CalendarGrid
            entries={calendarEntries}
            valueType={selectedHabit.valueType}
            today={today}
            windowStart={start365}
          />
        </div>
      </div>
    </div>
  );
}
