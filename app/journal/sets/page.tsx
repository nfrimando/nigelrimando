import { db } from "@/lib/db";
import { sets, exercises } from "@/lib/schema";
import { desc, isNotNull, gte, and, count, asc } from "drizzle-orm";
import DailyWorkoutSection from "./DailyWorkoutSection";
import ExerciseExplorer from "./ExerciseExplorer";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default async function JournalSetsPage() {

  const todayDate = new Date();
  const today = toDateStr(todayDate);

  // All training dates (completed sets only)
  const allDatesRaw = await db
    .select({ date: sets.date })
    .from(sets)
    .where(isNotNull(sets.actual))
    .groupBy(sets.date);
  const allTrainingDates = new Set(allDatesRaw.map((r) => r.date));
  const totalTrainingDays = allTrainingDates.size;

  // Total completed sets
  const [{ totalSets }] = await db
    .select({ totalSets: count() })
    .from(sets)
    .where(isNotNull(sets.actual));

  // Most recent block + week
  const [latestSet] = await db
    .select({ block: sets.block, week: sets.week })
    .from(sets)
    .where(isNotNull(sets.actual))
    .orderBy(desc(sets.date), desc(sets.id))
    .limit(1);

  // Training dates within the past year (for the daily workout selector)
  const oneYearAgo = new Date(todayDate);
  oneYearAgo.setFullYear(todayDate.getFullYear() - 1);
  const oneYearAgoStr = toDateStr(oneYearAgo);
  const recentTrainingDates = allDatesRaw
    .map((r) => r.date)
    .filter((d) => d >= oneYearAgoStr)
    .sort();

  // Days since last workout + latest training date
  const lastTrainingDate = allDatesRaw
    .map((r) => r.date)
    .sort()
    .at(-1) ?? null;
  let daysSinceLastWorkout: number | null = null;
  if (lastTrainingDate) {
    const last = new Date(lastTrainingDate + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    daysSinceLastWorkout = Math.round(
      (now.getTime() - last.getTime()) / 86_400_000,
    );
  }

  // Calendar: last 4 weeks as a Mon–Sun grid
  // Parse today's date string as local midnight so day-of-week is derived
  // from the same YYYY-MM-DD values stored in the DB — no UTC offset drift.
  const [ty, tm, td] = today.split("-").map(Number);
  const dow = new Date(ty, tm - 1, td).getDay(); // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;

  // Build calStartStr using local Date arithmetic (not toISOString)
  const calStartLocal = new Date(ty, tm - 1, td - daysFromMonday - 21);
  const calStartStr = [
    calStartLocal.getFullYear(),
    String(calStartLocal.getMonth() + 1).padStart(2, "0"),
    String(calStartLocal.getDate()).padStart(2, "0"),
  ].join("-");

  const activityRaw = await db
    .select({ date: sets.date, setCount: count() })
    .from(sets)
    .where(and(isNotNull(sets.actual), gte(sets.date, calStartStr)))
    .groupBy(sets.date);
  const activityMap = new Map(activityRaw.map((r) => [r.date, r.setCount]));

  const calDays: Array<{ date: string; count: number; isFuture: boolean }> = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(ty, tm - 1, td - daysFromMonday - 21 + i);
    const ds = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    calDays.push({
      date: ds,
      count: activityMap.get(ds) ?? 0,
      isFuture: ds > today,
    });
  }

  // All exercises for the explorer dropdown
  const allExercises = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .orderBy(asc(exercises.name));

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
            Exercise journal
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Never gonna stop being consistent!
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total sets" value={totalSets.toLocaleString()} />
          <StatCard
            label="Training days"
            value={totalTrainingDays.toLocaleString()}
          />
          <StatCard
            label="Current block"
            value={latestSet?.block ?? "—"}
            sub={latestSet ? `Week ${latestSet.week}` : undefined}
          />
          <StatCard
            label="Last workout"
            value={
              daysSinceLastWorkout === null
                ? "—"
                : daysSinceLastWorkout === 0
                  ? "Today"
                  : `${daysSinceLastWorkout}d ago`
            }
          />
        </div>

        {/* 4-week calendar */}
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-sm text-[var(--text)]">
              Last 4 weeks
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[3px] bg-[var(--surface-alt)] border border-[var(--border)]" />
                <span className="text-[11px] text-[var(--text-muted)]">Rest</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[3px] bg-[var(--accent)]" />
                <span className="text-[11px] text-[var(--text-muted)]">Trained</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] text-[var(--text-muted)] font-medium pb-1"
              >
                {d}
              </div>
            ))}
            {calDays.map(({ date, count: setCount, isFuture }) => (
              <div
                key={date}
                title={setCount > 0 ? `${date} — ${setCount} sets` : date}
                className={[
                  "aspect-square rounded-[8px] transition-colors",
                  isFuture
                    ? "opacity-0 pointer-events-none"
                    : setCount > 0
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--surface-alt)] border border-[var(--border)]",
                ].join(" ")}
              />
            ))}
          </div>
        </section>

        {/* Daily workout */}
        <DailyWorkoutSection latestDate={lastTrainingDate} trainingDates={recentTrainingDates} />

        {/* Exercise explorer */}
        <ExerciseExplorer exercises={allExercises} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5">
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className="font-heading font-bold text-2xl text-[var(--text)] leading-none">
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1.5">{sub}</p>}
    </div>
  );
}
