import { db } from "@/lib/db";
import { sets, exercises } from "@/lib/schema";
import { desc, isNotNull, gte, and, count, inArray } from "drizzle-orm";

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default async function JournalSetsPage() {

  const today = toDateStr(new Date());

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

  // Days since last workout
  const lastTrainingDate = allDatesRaw
    .map((r) => r.date)
    .sort()
    .at(-1);
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
  const todayDate = new Date();
  const dow = todayDate.getDay(); // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const calStart = new Date(todayDate);
  calStart.setDate(todayDate.getDate() - daysFromMonday - 21); // 4 Mondays ago

  const calStartStr = toDateStr(calStart);
  const activityRaw = await db
    .select({ date: sets.date, setCount: count() })
    .from(sets)
    .where(and(isNotNull(sets.actual), gte(sets.date, calStartStr)))
    .groupBy(sets.date);
  const activityMap = new Map(activityRaw.map((r) => [r.date, r.setCount]));

  const calDays: Array<{ date: string; count: number; isFuture: boolean }> = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(calStart);
    d.setDate(calStart.getDate() + i);
    const ds = toDateStr(d);
    calDays.push({
      date: ds,
      count: activityMap.get(ds) ?? 0,
      isFuture: ds > today,
    });
  }

  // Top 6 exercises by completed set count
  const topRaw = await db
    .select({ exerciseId: sets.exerciseId, setCount: count() })
    .from(sets)
    .where(isNotNull(sets.actual))
    .groupBy(sets.exerciseId)
    .orderBy(desc(count()))
    .limit(6);

  let topExercises: Array<{ name: string; count: number }> = [];
  if (topRaw.length > 0) {
    const exIds = topRaw.map((e) => e.exerciseId);
    const exNames = await db
      .select({ id: exercises.id, name: exercises.name })
      .from(exercises)
      .where(inArray(exercises.id, exIds));
    const nameMap = new Map(exNames.map((e) => [e.id, e.name]));
    topExercises = topRaw.map((e) => ({
      name: nameMap.get(e.exerciseId) ?? `#${e.exerciseId}`,
      count: e.setCount,
    }));
  }

  const maxCount = topExercises[0]?.count ?? 1;

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
          <h2 className="font-heading font-bold text-sm text-[var(--text)] mb-4">
            Last 4 weeks
          </h2>
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
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[3px] bg-[var(--surface-alt)] border border-[var(--border)]" />
              <span className="text-[11px] text-[var(--text-muted)]">Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[3px] bg-[var(--accent)]" />
              <span className="text-[11px] text-[var(--text-muted)]">
                Trained
              </span>
            </div>
          </div>
        </section>

        {/* Top exercises */}
        {topExercises.length > 0 && (
          <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
            <h2 className="font-heading font-bold text-sm text-[var(--text)] mb-5">
              Top exercises
            </h2>
            <div className="flex flex-col gap-4">
              {topExercises.map(({ name, count: setCount }) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text)] w-44 truncate shrink-0">
                    {name}
                  </span>
                  <div className="flex-1 h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded-full"
                      style={{ width: `${(setCount / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs text-[var(--text-muted)] w-8 text-right shrink-0">
                    {setCount}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
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
