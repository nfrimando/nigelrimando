export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { padelSets, persons } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const MY_PERSON_ID = 292;

type PersonStat = {
  id: number;
  name: string;
  sets: number;
  wins: number;
  losses: number;
  winRate: number;
};

type VenueStat = {
  name: string;
  sets: number;
  wins: number;
  winRate: number;
};

type MatchSet = {
  setNumber: number;
  gamesWon: number;
  gamesLost: number;
  won: boolean;
  videoUrl: string | null;
};

export type RecentMatch = {
  matchId: number;
  date: string;
  venue: string | null;
  sets: MatchSet[];
  partner: { id: number; name: string } | null;
  opponents: { left: { id: number; name: string }; right: { id: number; name: string } };
  setsWon: number;
  setsLost: number;
};

export type PadelAnalyticsPayload = {
  totalSets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  leftSide: { sets: number; wins: number; losses: number; winRate: number };
  rightSide: { sets: number; wins: number; losses: number; winRate: number };
  partners: PersonStat[];
  opponents: PersonStat[];
  recentForm: ("W" | "L")[];
  venues: VenueStat[];
  recentMatches: RecentMatch[];
};

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit") ?? "50";

  const [rows, personRows] = await Promise.all([
    limitParam === "all"
      ? db
          .select()
          .from(padelSets)
          .orderBy(desc(padelSets.date), desc(padelSets.id))
      : db
          .select()
          .from(padelSets)
          .orderBy(desc(padelSets.date), desc(padelSets.id))
          .limit(parseInt(limitParam, 10)),
    db.select().from(persons),
  ]);

  const personMap = new Map(personRows.map((p) => [p.id, p.name]));

  let totalWins = 0;
  let totalLosses = 0;

  const leftSide = { sets: 0, wins: 0, losses: 0 };
  const rightSide = { sets: 0, wins: 0, losses: 0 };

  const partnerMap = new Map<number, { wins: number; losses: number }>();
  const opponentMap = new Map<number, { wins: number; losses: number }>();
  const venueMap = new Map<string, { wins: number; losses: number }>();
  // matchId → match data (insertion order = date desc, id desc)
  const matchMap = new Map<number, RecentMatch>();

  for (const row of rows) {
    const won = row.gamesWon > row.gamesLost;
    if (won) totalWins++;
    else totalLosses++;

    // Left / right side
    if (row.teammateLeft === MY_PERSON_ID) {
      leftSide.sets++;
      if (won) leftSide.wins++;
      else leftSide.losses++;
    } else if (row.teammateRight === MY_PERSON_ID) {
      rightSide.sets++;
      if (won) rightSide.wins++;
      else rightSide.losses++;
    }

    // Partners (the other teammate)
    const partnerId =
      row.teammateLeft === MY_PERSON_ID
        ? row.teammateRight
        : row.teammateRight === MY_PERSON_ID
          ? row.teammateLeft
          : null;
    if (partnerId !== null) {
      const cur = partnerMap.get(partnerId) ?? { wins: 0, losses: 0 };
      if (won) cur.wins++;
      else cur.losses++;
      partnerMap.set(partnerId, cur);
    }

    // Opponents (both sides)
    for (const oppId of [row.opponentLeft, row.opponentRight]) {
      const cur = opponentMap.get(oppId) ?? { wins: 0, losses: 0 };
      if (won) cur.wins++;
      else cur.losses++;
      opponentMap.set(oppId, cur);
    }

    // Venues
    if (row.venue) {
      const cur = venueMap.get(row.venue) ?? { wins: 0, losses: 0 };
      if (won) cur.wins++;
      else cur.losses++;
      venueMap.set(row.venue, cur);
    }

    // Recent matches grouped by matchId
    if (!matchMap.has(row.matchId)) {
      const partnerId =
        row.teammateLeft === MY_PERSON_ID
          ? row.teammateRight
          : row.teammateRight === MY_PERSON_ID
            ? row.teammateLeft
            : null;
      matchMap.set(row.matchId, {
        matchId: row.matchId,
        date: row.date,
        venue: row.venue ?? null,
        sets: [],
        partner:
          partnerId !== null
            ? { id: partnerId, name: personMap.get(partnerId) ?? `Person ${partnerId}` }
            : null,
        opponents: {
          left: { id: row.opponentLeft, name: personMap.get(row.opponentLeft) ?? `Person ${row.opponentLeft}` },
          right: { id: row.opponentRight, name: personMap.get(row.opponentRight) ?? `Person ${row.opponentRight}` },
        },
        setsWon: 0,
        setsLost: 0,
      });
    }
    const match = matchMap.get(row.matchId)!;
    match.sets.push({ setNumber: row.setNumber, gamesWon: row.gamesWon, gamesLost: row.gamesLost, won, videoUrl: row.videoUrl ?? null });
    if (won) match.setsWon++;
    else match.setsLost++;
  }

  const toPersonStat = (
    map: Map<number, { wins: number; losses: number }>,
  ): PersonStat[] =>
    [...map.entries()]
      .map(([id, { wins, losses }]) => ({
        id,
        name: personMap.get(id) ?? `Person ${id}`,
        sets: wins + losses,
        wins,
        losses,
        winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
      }))
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 5);

  const venues: VenueStat[] = [...venueMap.entries()]
    .map(([name, { wins, losses }]) => ({
      name,
      sets: wins + losses,
      wins,
      winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
    }))
    .sort((a, b) => b.sets - a.sets)
    .slice(0, 5);

  // Sort sets within each match by set number ascending
  const recentMatches: RecentMatch[] = [...matchMap.values()].map((m) => ({
    ...m,
    sets: m.sets.sort((a, b) => a.setNumber - b.setNumber),
  }));

  // Recent form: last 9 chronologically (rows are desc, so reverse slice)
  const formRows = rows.slice(0, 9).reverse();
  const recentForm: ("W" | "L")[] = formRows.map((r) =>
    r.gamesWon > r.gamesLost ? "W" : "L",
  );

  const totalSets = rows.length;

  const payload: PadelAnalyticsPayload = {
    totalSets,
    totalWins,
    totalLosses,
    winRate: totalSets > 0 ? totalWins / totalSets : 0,
    leftSide: {
      ...leftSide,
      winRate: leftSide.sets > 0 ? leftSide.wins / leftSide.sets : 0,
    },
    rightSide: {
      ...rightSide,
      winRate: rightSide.sets > 0 ? rightSide.wins / rightSide.sets : 0,
    },
    partners: toPersonStat(partnerMap),
    opponents: toPersonStat(opponentMap),
    recentForm,
    venues,
    recentMatches,
  };

  return NextResponse.json(payload);
}
