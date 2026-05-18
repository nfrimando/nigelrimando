import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { thoughts } from "@/lib/schema";
import { desc, getTableColumns, like, or, sql } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25")));
  const q = searchParams.get("q")?.trim() ?? "";
  const offset = (page - 1) * limit;

  const condition = q
    ? or(
        like(thoughts.entryDate, `%${q}%`),
        like(thoughts.thought, `%${q}%`),
        like(thoughts.type, `%${q}%`),
      )
    : undefined;

  const rows = await db
    .select({ ...getTableColumns(thoughts), total: sql<number>`COUNT(*) OVER()` })
    .from(thoughts)
    .where(condition)
    .orderBy(desc(thoughts.entryDate), desc(thoughts.createdAt))
    .limit(limit)
    .offset(offset);

  const total = rows[0]?.total ?? 0;
  const data = rows.map(({ total: _, ...rest }) => rest);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { entryDate, thought, type } = body;

  if (!entryDate?.trim()) {
    return NextResponse.json({ error: "Entry date is required" }, { status: 400 });
  }
  if (!thought?.trim()) {
    return NextResponse.json({ error: "Thought is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(thoughts)
    .values({
      entryDate: entryDate.trim(),
      thought: thought.trim(),
      type: type?.trim() || null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
