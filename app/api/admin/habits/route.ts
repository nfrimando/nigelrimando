import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { habits } from "@/lib/schema";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.select().from(habits).orderBy(habits.label);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { key, label, description, category, valueType, isActive } = body;

  if (!key?.trim()) return NextResponse.json({ error: "Key is required" }, { status: 400 });
  if (!label?.trim()) return NextResponse.json({ error: "Label is required" }, { status: 400 });
  if (!category?.trim()) return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!valueType?.trim()) return NextResponse.json({ error: "Value type is required" }, { status: 400 });

  const [row] = await db
    .insert(habits)
    .values({
      key: key.trim(),
      label: label.trim(),
      description: description?.trim() || null,
      category: category.trim(),
      valueType: valueType.trim(),
      isActive: isActive !== false,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
