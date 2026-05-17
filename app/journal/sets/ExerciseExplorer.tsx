"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

type Exercise = { id: number; name: string };
type HistoryPoint = { date: string; value: number | null; measure: string | null };
type Range = "1y" | "2y" | "all";

const RANGES: { label: string; value: Range }[] = [
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "All", value: "all" },
];

function getRangeFrom(range: Range): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setFullYear(d.getFullYear() - (range === "2y" ? 2 : 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

function longDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CustomTooltip({
  active,
  payload,
  label,
  measure,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  measure?: string;
}) {
  if (!active || !payload?.length || payload[0].value == null) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-3 py-2 shadow-sm">
      <p className="text-[11px] text-[var(--text-muted)] font-mono">{label ? longDate(label) : ""}</p>
      <p className="text-sm font-bold text-[var(--text)] font-mono mt-0.5">
        {payload[0].value}{measure ? ` ${measure}` : ""}
      </p>
    </div>
  );
}

export default function ExerciseExplorer({ exercises }: { exercises: Exercise[] }) {
  const defaultId = exercises.find((e) => e.name.toLowerCase() === "deadlift")?.id ?? exercises[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(defaultId);
  const [range, setRange] = useState<Range>("1y");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedId == null) return;
    setLoading(true);
    const from = getRangeFrom(range);
    const url = `/api/journal/exercise-history?exerciseId=${selectedId}${from ? `&from=${from}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data.filter((p: HistoryPoint) => p.value != null) : []))
      .finally(() => setLoading(false));
  }, [selectedId, range]);

  const measure = history.find((p) => p.measure)?.measure ?? "";
  const selectedName = exercises.find((e) => e.id === selectedId)?.name ?? "";

  if (exercises.length === 0) return null;

  return (
    <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-heading font-bold text-sm text-[var(--text)]">Exercise explorer</h2>
          {selectedName && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Progression over time</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Range toggle */}
          <div className="flex items-center bg-[var(--surface-alt)] border border-[var(--border)] rounded-[10px] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={[
                  "text-[11px] font-mono px-2.5 py-1 rounded-[8px] transition-colors",
                  range === r.value
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
          {/* Exercise select */}
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="text-xs font-mono text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--border)] rounded-[10px] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] w-fit max-w-[200px] sm:max-w-none"
          >
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] animate-spin" />
        </div>
      ) : history.length < 2 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-[var(--text-muted)]">
            {history.length === 0 ? "No data yet for this exercise." : "Need at least 2 sessions to show a trend."}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E5DDD6" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "#66707A", fontFamily: "var(--font-mono, monospace)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#66707A", fontFamily: "var(--font-mono, monospace)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}${measure ? ` ${measure}` : ""}`}
              width={measure ? 48 : 32}
            />
            <Tooltip
              content={<CustomTooltip measure={measure} />}
              cursor={{ stroke: "#E5DDD6", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#4E6877"
              strokeWidth={2}
              dot={<Dot r={3} fill="#4E6877" stroke="#4E6877" />}
              activeDot={{ r: 5, fill: "#4E6877", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Footer */}
      {history.length >= 2 && (
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-3 text-center">
          {history.length} sessions · peak {measure || "value"} per session
        </p>
      )}
    </section>
  );
}
