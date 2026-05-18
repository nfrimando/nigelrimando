"use client";

import { useEffect, useState } from "react";
import type { EbikePayload, EbikeTrip } from "@/app/api/journal/ebike/route";

const LIMIT_OPTIONS = [
  { label: "Last 10", value: "10" },
  { label: "Last 25", value: "25" },
  { label: "Last 50", value: "50" },
  // { label: "All trips", value: "all" },
] as const;

function tripDuration(
  startTime: string | null,
  endTime: string | null,
): string | null {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function EbikeTrips() {
  const [limit, setLimit] = useState<string>("10");
  const [data, setData] = useState<EbikePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/journal/ebike?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [limit]);

  return (
    <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--border)] p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="font-heading font-bold text-sm text-[var(--text)]">
          Recent trips
          {data && !loading && (
            <span className="font-normal text-[var(--text-muted)] ml-2">
              ({data.trips.length} of {data.totalCount})
            </span>
          )}
        </h2>
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
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-[12px] bg-[var(--surface-alt)]"
            />
          ))}
        </div>
      ) : !data || data.trips.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No trips recorded yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {data.trips.map((trip) => (
            <TripRow key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </section>
  );
}

function TripRow({ trip }: { trip: EbikeTrip }) {
  const dur = tripDuration(trip.startTime, trip.endTime);
  const hasRoute = trip.origin || trip.destination;

  return (
    <div className="py-4 first:pt-0 last:pb-0 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--text-muted)] font-mono">
            {trip.date}
          </span>
          {trip.startTime && (
            <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-alt)] px-2 py-0.5 rounded-full">
              {formatTime(trip.startTime)}
              {trip.endTime ? ` → ${formatTime(trip.endTime)}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trip.videoUrl && (
            <a
              href={trip.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#FF0000] hover:opacity-70 transition-opacity"
              title="Watch video"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          )}
          {dur && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--surface-alt)] text-[var(--accent)]">
              {dur}
            </span>
          )}
        </div>
      </div>
      {hasRoute && (
        <p className="text-sm text-[var(--text)]">
          {trip.origin && <span className="font-medium">{trip.origin}</span>}
          {trip.origin && trip.destination && (
            <span className="text-[var(--text-muted)]"> → </span>
          )}
          {trip.destination && <span>{trip.destination}</span>}
        </p>
      )}
      {trip.notes && (
        <p className="text-xs text-[var(--text-muted)]">{trip.notes}</p>
      )}
    </div>
  );
}
