"use client";

import { useEffect, useState } from "react";
import type {
  PadelAnalyticsPayload,
  RecentMatch,
} from "@/app/api/journal/padel/route";

const LIMIT_OPTIONS = [
  { label: "Last 10", value: "10" },
  { label: "Last 25", value: "25" },
  { label: "Last 50", value: "50" },
  { label: "Last 100", value: "100" },
  // { label: "Last 200", value: "200" },
  // { label: "All time", value: "all" },
] as const;

export default function PadelAnalytics() {
  const [limit, setLimit] = useState<string>("50");
  const [data, setData] = useState<PadelAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/journal/padel?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [limit]);

  return (
    <div className="flex flex-col gap-6">
      {/* Limit selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--text-muted)] font-medium">
          Showing
        </span>
        <select
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[10px] px-3 py-1.5 text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        >
          {LIMIT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {data && !loading && (
          <span className="text-xs text-[var(--text-muted)]">
            {data.totalSets} sets
          </span>
        )}
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : data ? (
        <AnalyticsContent data={data} />
      ) : null}
    </div>
  );
}

function AnalyticsContent({ data }: { data: PadelAnalyticsPayload }) {
  const pct = (r: number) => `${Math.round(r * 100)}%`;

  return (
    <div className="flex flex-col gap-6">
      {/* Overall win rate */}
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6 flex flex-col items-center text-center">
        <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Win rate
        </p>
        <p className="font-heading font-bold text-5xl text-[var(--text)] leading-none">
          {pct(data.winRate)}
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-3">
          {data.totalWins} wins · {data.totalLosses} losses
        </p>

        {data.recentForm.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[var(--border)] w-full flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-1.5">
              {data.recentForm.map((result, i) => (
                <span
                  key={i}
                  className={[
                    "w-7 h-7 flex items-center justify-center rounded-[6px] text-[11px] font-bold",
                    result === "W"
                      ? "bg-[#E8F0E9] text-[var(--success)]"
                      : "bg-[#F2EAE8] text-[var(--warm)]",
                  ].join(" ")}
                >
                  {result}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              older → newer
            </p>
          </div>
        )}
      </div>

      {/* Left / right side */}
      <div className="grid grid-cols-2 gap-4">
        <SideCard label="Left side" data={data.leftSide} accent="accent" />
        <SideCard label="Right side" data={data.rightSide} accent="warm" />
      </div>

      {/* Partners & opponents */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PersonTable title="Partners" rows={data.partners} />
        <PersonTable title="Opponents" rows={data.opponents} />
      </div>

      {/* Venues */}
      {data.venues.length > 0 && (
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
          <h2 className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest mb-4">
            Venues
          </h2>
          <div className="flex flex-col gap-3">
            {data.venues.map((v) => (
              <div
                key={v.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-[var(--text)] font-medium truncate">
                  {v.name}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[var(--text-muted)]">
                    {v.sets} sets
                  </span>
                  <WinRateBadge rate={v.winRate} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent matches */}
      {data.recentMatches.length > 0 && (
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
          <h2 className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest mb-4">
            Recent matches
          </h2>
          <div className="flex flex-col divide-y divide-[var(--border)]">
            {data.recentMatches.map((m) => (
              <MatchRow key={m.matchId} match={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SideCard({
  label,
  data,
  accent,
}: {
  label: string;
  data: { sets: number; wins: number; losses: number; winRate: number };
  accent: "accent" | "warm";
}) {
  const pct = (r: number) => `${Math.round(r * 100)}%`;
  const color = accent === "accent" ? "var(--accent)" : "var(--warm)";

  return (
    <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-5">
      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest mb-2">
        {label}
      </p>
      <p
        className="font-heading font-bold text-3xl leading-none"
        style={{ color }}
      >
        {data.sets}
        <span className="text-base font-medium text-[var(--text-muted)] ml-1">
          sets
        </span>
      </p>
      <p className="text-xs text-[var(--text-muted)] mt-2">
        {pct(data.winRate)} win rate · {data.wins}W {data.losses}L
      </p>
    </div>
  );
}

function PersonTable({
  title,
  rows,
}: {
  title: string;
  rows: {
    id: number;
    name: string;
    sets: number;
    wins: number;
    losses: number;
    winRate: number;
  }[];
}) {
  return (
    <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
      <h2 className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest mb-4">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No data</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text)] font-medium truncate">
                {r.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--text-muted)]">
                  {r.sets}
                </span>
                <WinRateBadge rate={r.winRate} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WinRateBadge({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const isGood = pct >= 50;
  return (
    <span
      className={[
        "text-[10px] font-bold px-2 py-0.5 rounded-full",
        isGood
          ? "bg-[#E8F0E9] text-[var(--success)]"
          : "bg-[#F2EAE8] text-[var(--warm)]",
      ].join(" ")}
    >
      {pct}%
    </span>
  );
}

function MatchRow({ match }: { match: RecentMatch }) {
  const matchWon = match.setsWon > match.setsLost;
  const matchLost = match.setsLost > match.setsWon;

  return (
    <div className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2">
      {/* Top row: date + result badge + venue */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {match.date}
          </span>
          {match.venue && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-full">
              {match.venue}
            </span>
          )}
        </div>
        <span
          className={[
            "text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0",
            matchWon
              ? "bg-[#E8F0E9] text-[var(--success)]"
              : matchLost
                ? "bg-[#F2EAE8] text-[var(--warm)]"
                : "bg-[var(--surface-alt)] text-[var(--text-muted)]",
          ].join(" ")}
        >
          {matchWon ? "Win" : matchLost ? "Loss" : "Draw"} {match.setsWon}–
          {match.setsLost}
        </span>
      </div>

      {/* Players */}
      <div className="text-sm text-[var(--text)]">
        <span className="font-medium">
          Me{match.partner ? ` & ${match.partner.name}` : ""}
        </span>
        <span className="text-[var(--text-muted)]"> vs </span>
        <span>
          {match.opponents.left.name} & {match.opponents.right.name}
        </span>
      </div>

      {/* Set scores */}
      <div className="flex flex-wrap gap-1.5">
        {match.sets.map((s, i) => (
          <span
            key={i}
            className={[
              "text-xs px-2 py-0.5 rounded-[6px] font-mono",
              s.won
                ? "bg-[#E8F0E9] text-[var(--success)]"
                : "bg-[#F2EAE8] text-[var(--warm)]",
            ].join(" ")}
          >
            {s.gamesWon}–{s.gamesLost}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] h-36" />
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] h-28" />
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] h-28" />
      </div>
      <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] h-24" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] h-40" />
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] h-40" />
      </div>
    </div>
  );
}
