export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { padelSets } from "@/lib/schema";
import { count, countDistinct, max } from "drizzle-orm";
import PadelAnalytics from "./PadelAnalytics";

function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(
    new Date(),
  );
}

export default async function PadelJournalPage() {
  const today = todayPH();

  const [matchesRow, setsRow, datesRow, lastRow] = await Promise.all([
    db
      .select({ totalMatches: countDistinct(padelSets.matchId) })
      .from(padelSets),
    db.select({ totalSets: count() }).from(padelSets),
    db
      .select({ date: padelSets.date })
      .from(padelSets)
      .groupBy(padelSets.date),
    db.select({ lastDate: max(padelSets.date) }).from(padelSets),
  ]);

  const totalMatches = matchesRow[0]?.totalMatches ?? 0;
  const totalSets = setsRow[0]?.totalSets ?? 0;
  const totalDays = datesRow.length;
  const lastDate = lastRow[0]?.lastDate ?? null;

  let daysSinceLastPlayed: number | null = null;
  if (lastDate) {
    const [ty, tm, td] = today.split("-").map(Number);
    const [ly, lm, ld] = lastDate.split("-").map(Number);
    const todayLocal = new Date(ty, tm - 1, td);
    const lastLocal = new Date(ly, lm - 1, ld);
    daysSinceLastPlayed = Math.round(
      (todayLocal.getTime() - lastLocal.getTime()) / 86_400_000,
    );
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
            Padel journal
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Tracking every set on the court.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total matches"
            value={totalMatches.toLocaleString()}
          />
          <StatCard label="Total sets" value={totalSets.toLocaleString()} />
          <StatCard label="Days played" value={totalDays.toLocaleString()} />
          <StatCard
            label="Last played"
            value={
              daysSinceLastPlayed === null
                ? "—"
                : daysSinceLastPlayed === 0
                  ? "Today"
                  : `${daysSinceLastPlayed}d ago`
            }
            sub={lastDate ?? undefined}
          />
        </div>

        {/* Analytics */}
        <PadelAnalytics />
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
