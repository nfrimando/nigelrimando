export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { transports } from "@/lib/schema";
import { and, eq, count, desc } from "drizzle-orm";
import EbikeTrips from "./EbikeTrips";

function todayPH(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
}

export default async function EbikeJournalPage() {
  const today = todayPH();
  const [ty, tm, td] = today.split("-").map(Number);

  // Only ebike trips (not charging, not other modes)
  const ebikeFilter = and(
    eq(transports.eventType, "trip"),
    eq(transports.mode, "ebike"),
  );

  const [allTripsRaw, [countRow]] = await Promise.all([
    db
      .select({
        date: transports.date,
        destination: transports.destination,
      })
      .from(transports)
      .where(ebikeFilter)
      .orderBy(desc(transports.date), desc(transports.id)),
    db.select({ total: count() }).from(transports).where(ebikeFilter),
  ]);

  const totalTrips = countRow?.total ?? 0;

  // Distinct ride days
  const rideDates = new Set(allTripsRaw.map((r) => r.date));
  const totalDays = rideDates.size;

  // Last ride + days since
  const lastDate = allTripsRaw[0]?.date ?? null;
  let daysSinceLastRide: number | null = null;
  if (lastDate) {
    const [ly, lm, ld] = lastDate.split("-").map(Number);
    const todayLocal = new Date(ty, tm - 1, td);
    const lastLocal = new Date(ly, lm - 1, ld);
    daysSinceLastRide = Math.round(
      (todayLocal.getTime() - lastLocal.getTime()) / 86_400_000,
    );
  }

  // Top destination (most frequent non-null destination)
  const destCounts = new Map<string, number>();
  for (const { destination } of allTripsRaw) {
    if (destination) {
      destCounts.set(destination, (destCounts.get(destination) ?? 0) + 1);
    }
  }
  let topDestination: string | null = null;
  let topDestCount = 0;
  for (const [dest, cnt] of destCounts) {
    if (cnt > topDestCount) {
      topDestination = dest;
      topDestCount = cnt;
    }
  }

  // Calendar: last 4 weeks Mon–Sun grid
  const dow = new Date(ty, tm - 1, td).getDay(); // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const calStartLocal = new Date(ty, tm - 1, td - daysFromMonday - 21);
  const calStartStr = [
    calStartLocal.getFullYear(),
    String(calStartLocal.getMonth() + 1).padStart(2, "0"),
    String(calStartLocal.getDate()).padStart(2, "0"),
  ].join("-");

  // Only dates within calendar window from rideDates
  const calDays: Array<{ date: string; rode: boolean; isFuture: boolean }> = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(ty, tm - 1, td - daysFromMonday - 21 + i);
    const ds = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-");
    calDays.push({
      date: ds,
      rode: rideDates.has(ds),
      isFuture: ds > today,
    });
  }

  // suppress unused warning — calStartStr is only used to scope the calendar query if needed
  void calStartStr;

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
            Ebike journal
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Every ride tracked — one trip at a time.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total trips" value={totalTrips.toLocaleString()} />
          <StatCard label="Days ridden" value={totalDays.toLocaleString()} />
          <StatCard
            label="Top destination"
            value={topDestination ?? "—"}
            sub={topDestination ? `${topDestCount} trips` : undefined}
          />
          <StatCard
            label="Last ride"
            value={
              daysSinceLastRide === null
                ? "—"
                : daysSinceLastRide === 0
                  ? "Today"
                  : `${daysSinceLastRide}d ago`
            }
            sub={lastDate ?? undefined}
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
                <span className="text-[11px] text-[var(--text-muted)]">No ride</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-[3px] bg-[var(--accent)]" />
                <span className="text-[11px] text-[var(--text-muted)]">Rode</span>
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
            {calDays.map(({ date, rode, isFuture }) => (
              <div
                key={date}
                title={rode ? `Rode on ${date}` : date}
                className={[
                  "aspect-square rounded-[8px] transition-colors",
                  isFuture
                    ? "opacity-0 pointer-events-none"
                    : rode
                      ? "bg-[var(--accent)]"
                      : "bg-[var(--surface-alt)] border border-[var(--border)]",
                ].join(" ")}
              />
            ))}
          </div>
        </section>

        {/* Recent trips */}
        <EbikeTrips />
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
      <p className="font-heading font-bold text-2xl text-[var(--text)] leading-none truncate">
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--text-muted)] mt-1.5">{sub}</p>}
    </div>
  );
}
