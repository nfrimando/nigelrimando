import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { desc, like, or, count } from "drizzle-orm";

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
        like(expenses.date, `%${q}%`),
        like(expenses.category, `%${q}%`),
        like(expenses.subcategory, `%${q}%`),
        like(expenses.item, `%${q}%`),
        like(expenses.shop, `%${q}%`),
        like(expenses.notes, `%${q}%`),
      )
    : undefined;

  const [{ total }] = await db.select({ total: count() }).from(expenses).where(condition);

  const data = await db
    .select()
    .from(expenses)
    .where(condition)
    .orderBy(desc(expenses.date), desc(expenses.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ data, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const month = date.trim().slice(0, 7); // YYYY-MM

  const [row] = await db
    .insert(expenses)
    .values({
      date: date.trim(),
      category: category.trim(),
      subcategory: subcategory?.trim() || null,
      item: item.trim(),
      amount: Number(amount),
      shop: shop?.trim() || null,
      month,
      notes: notes?.trim() || null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
