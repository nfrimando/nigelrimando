import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { date, category, subcategory, item, amount, shop, notes } = body;

  if (!date?.trim()) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }
  if (!category?.trim()) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (!item?.trim()) {
    return NextResponse.json({ error: "Item is required" }, { status: 400 });
  }
  if (amount == null || isNaN(Number(amount))) {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 });
  }

  const month = date.trim().slice(0, 7);

  const [row] = await db
    .update(expenses)
    .set({
      date: date.trim(),
      category: category.trim(),
      subcategory: subcategory?.trim() || null,
      item: item.trim(),
      amount: Number(amount),
      shop: shop?.trim() || null,
      month,
      notes: notes?.trim() || null,
    })
    .where(eq(expenses.id, Number(id)))
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(expenses).where(eq(expenses.id, Number(id)));
  return NextResponse.json({ ok: true });
}
