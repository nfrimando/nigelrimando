import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transports } from "@/lib/schema";
import { and, eq, desc } from "drizzle-orm";

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === "all" ? null : Math.min(Number(limitParam) || 10, 500);

  const allTrips = await db
    .select({
      id: transports.id,
      date: transports.date,
      startTime: transports.startTime,
      endTime: transports.endTime,
      origin: transports.origin,
      destination: transports.destination,
      notes: transports.notes,
      videoUrl: transports.videoUrl,
    })
    .from(transports)
    .where(
      and(
        eq(transports.eventType, "trip"),
        eq(transports.mode, "ebike"),
      ),
    )
    .orderBy(desc(transports.date), desc(transports.id));

  const totalCount = allTrips.length;
  const trips = limit !== null ? allTrips.slice(0, limit) : allTrips;

  return NextResponse.json({ trips, totalCount } satisfies EbikePayload);
}
