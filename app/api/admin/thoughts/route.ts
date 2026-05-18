import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { thoughts } from "@/lib/schema";
import { desc } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db.select().from(thoughts).orderBy(desc(thoughts.entryDate), desc(thoughts.createdAt));
  return NextResponse.json(data);
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
