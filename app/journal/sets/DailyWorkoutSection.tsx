"use client";

import { useEffect, useState } from "react";

type SetRow = { actual: number | null; value: number | null; measure: string | null };
type ExerciseGroup = { exerciseId: number; name: string; sets: SetRow[] };

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatSelectDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function weightSummary(sets: SetRow[]): string {
  const values = sets.map((s) => s.value).filter((v): v is number => v !== null);
  const measure = sets.find((s) => s.measure)?.measure ?? "";
  if (values.length === 0) return "—";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min} ${measure}`.trim() : `${min}–${max} ${measure}`.trim();
}

function repsSummary(sets: SetRow[]): string {
  const actuals = sets.map((s) => s.actual).filter((v): v is number => v !== null);
  if (actuals.length === 0) return "—";
  const min = Math.min(...actuals);
  const max = Math.max(...actuals);
  const measure = sets.find((s) => s.measure)?.measure ?? "";
  const isWeightBased = !measure || ["kg", "lbs"].includes(measure);
  const unit = isWeightBased ? "reps" : measure;
  return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
}

export default function DailyWorkoutSection({
  latestDate,
  trainingDates,
}: {
  latestDate: string | null;
  trainingDates: string[];
}) {
  const [selectedDate, setSelectedDate] = useState(latestDate ?? "");
  const [groups, setGroups] = useState<ExerciseGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetch(`/api/journal/daily?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  if (!latestDate) return null;

  const sortedDates = [...trainingDates].reverse();

  return (
    <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="font-heading font-bold text-sm text-[var(--text)]">
            Daily workout
          </h2>
          {selectedDate && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {formatDate(selectedDate)}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-mono text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--border)] rounded-[10px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-fit"
          >
            {sortedDates.map((date) => (
              <option key={date} value={date}>
                {formatSelectDate(date)}
              </option>
            ))}
          </select>
          <span
            className="text-[10px] text-[var(--text-muted)]"
            title="Only training days from the past year are shown"
          >
            Past year · {trainingDates.length} sessions
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-4 text-center">
          No workout logged for this date.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div
              key={g.exerciseId}
              className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">{g.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono">
                  {weightSummary(g.sets)} · {repsSummary(g.sets)}
                </p>
              </div>
              <span className="font-mono text-xs text-[var(--accent)] bg-[var(--surface-alt)] border border-[var(--border)] rounded-[8px] px-2.5 py-1 shrink-0">
                {g.sets.length} {g.sets.length === 1 ? "set" : "sets"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
