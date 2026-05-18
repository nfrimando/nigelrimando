import { db } from "@/lib/db";
import { sets, exercises, padelSets } from "@/lib/schema";
import { desc, isNotNull, gte, and, count, asc } from "drizzle-orm";
import DailyWorkoutSection from "./DailyWorkoutSection";
import ExerciseExplorer from "./ExerciseExplorer";

// All date arithmetic uses Philippines time (Asia/Manila, UTC+8).
// The server runs in UTC; using toISOString() would give the wrong date
// during the 8 hours before midnight PH where UTC is still the prior day.
function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

export default async function JournalSetsPage() {

  const today = todayPH();

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
  const [ty, tm, td] = today.split("-").map(Number);
  const oneYearAgoLocal = new Date(ty - 1, tm - 1, td);
  const oneYearAgoStr = [
    oneYearAgoLocal.getFullYear(),
    String(oneYearAgoLocal.getMonth() + 1).padStart(2, "0"),
    String(oneYearAgoLocal.getDate()).padStart(2, "0"),
  ].join("-");
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
    const [ly, lm, ld] = lastTrainingDate.split("-").map(Number);
    const lastLocal = new Date(ly, lm - 1, ld);
    const todayLocal = new Date(ty, tm - 1, td);
    daysSinceLastWorkout = Math.round(
      (todayLocal.getTime() - lastLocal.getTime()) / 86_400_000,
    );
  }

  // Calendar: last 4 weeks as a Mon–Sun grid
  const dow = new Date(ty, tm - 1, td).getDay(); // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;

  // Build calStartStr using local Date arithmetic (not toISOString)
  const calStartLocal = new Date(ty, tm - 1, td - daysFromMonday - 21);
  const calStartStr = [
    calStartLocal.getFullYear(),
    String(calStartLocal.getMonth() + 1).padStart(2, "0"),
    String(calStartLocal.getDate()).padStart(2, "0"),
  ].join("-");

  const [activityRaw, padelDatesRaw] = await Promise.all([
    db
      .select({ date: sets.date, setCount: count() })
      .from(sets)
      .where(and(isNotNull(sets.actual), gte(sets.date, calStartStr)))
      .groupBy(sets.date),
    db
      .select({ date: padelSets.date })
      .from(padelSets)
      .where(gte(padelSets.date, calStartStr))
      .groupBy(padelSets.date),
  ]);
  const activityMap = new Map(activityRaw.map((r) => [r.date, r.setCount]));
  const padelDates = new Set(padelDatesRaw.map((r) => r.date));

  const calDays: Array<{ date: string; count: number; hasPadel: boolean; isFuture: boolean }> = [];
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
      hasPadel: padelDates.has(ds),
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-y-2">
            <h2 className="font-heading font-bold text-sm text-[var(--text)]">
              Last 4 weeks
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[3px] bg-[var(--surface-alt)] border border-[var(--border)]" />
                <span className="text-[11px] text-[var(--text-muted)]">Rest</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[3px] bg-[var(--accent)]" />
                <span className="text-[11px] text-[var(--text-muted)]">Gym</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[3px] bg-[#5E8365]" />
                <span className="text-[11px] text-[var(--text-muted)]">Padel</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-[3px]"
                  style={{ background: "linear-gradient(135deg, var(--accent) 50%, #5E8365 50%)" }}
                />
                <span className="text-[11px] text-[var(--text-muted)]">Both</span>
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
            {calDays.map(({ date, count: setCount, hasPadel, isFuture }) => {
              const hasGym = setCount > 0;
              const hasBoth = hasGym && hasPadel;

              const title = [
                hasGym ? `${setCount} gym sets` : null,
                hasPadel ? "padel" : null,
              ].filter(Boolean).join(" · ");

              const cellStyle = hasBoth
                ? { background: "linear-gradient(135deg, var(--accent) 50%, #5E8365 50%)" }
                : undefined;

              const cellClass = [
                "aspect-square rounded-[8px] transition-colors",
                isFuture
                  ? "opacity-0 pointer-events-none"
                  : hasBoth
                    ? ""
                    : hasGym
                      ? "bg-[var(--accent)]"
                      : hasPadel
                        ? "bg-[#5E8365]"
                        : "bg-[var(--surface-alt)] border border-[var(--border)]",
              ].join(" ");

              const cell = (
                <div
                  key={date}
                  title={title || date}
                  className={cellClass}
                  style={cellStyle}
                />
              );

              return hasPadel && !isFuture ? (
                <a key={date} href="/journal/padel" className="contents">
                  {cell}
                </a>
              ) : (
                cell
              );
            })}
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
