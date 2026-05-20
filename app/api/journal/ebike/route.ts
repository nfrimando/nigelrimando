export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transports } from "@/lib/schema";
import { and, count, eq, desc } from "drizzle-orm";

export type EbikeTrip = {
  id: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  origin: string | null;
  destination: string | null;
  notes: string | null;
  videoUrl: string | null;
};

export type EbikePayload = {
  trips: EbikeTrip[];
  totalCount: number;
};

const TRIP_FIELDS = {
  id: transports.id,
  date: transports.date,
  startTime: transports.startTime,
  endTime: transports.endTime,
  origin: transports.origin,
  destination: transports.destination,
  notes: transports.notes,
  videoUrl: transports.videoUrl,
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === "all" ? null : Math.min(Number(limitParam) || 10, 500);

  const condition = and(eq(transports.eventType, "trip"), eq(transports.mode, "ebike"));
  const ordering = [desc(transports.date), desc(transports.id)] as const;

  const [[{ totalCount }], trips] = await Promise.all([
    db.select({ totalCount: count() }).from(transports).where(condition),
    limit !== null
      ? db.select(TRIP_FIELDS).from(transports).where(condition).orderBy(...ordering).limit(limit)
      : db.select(TRIP_FIELDS).from(transports).where(condition).orderBy(...ordering),
  ]);

  return NextResponse.json({ trips, totalCount } satisfies EbikePayload);
}
