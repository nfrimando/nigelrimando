import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { asc, isNotNull } from "drizzle-orm";

async function requireAuth() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) return null;
  return session;
}

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [cats, subs, shops] = await Promise.all([
    db.selectDistinct({ v: expenses.category }).from(expenses).orderBy(asc(expenses.category)),
    db.selectDistinct({ v: expenses.subcategory }).from(expenses).where(isNotNull(expenses.subcategory)).orderBy(asc(expenses.subcategory)),
    db.selectDistinct({ v: expenses.shop }).from(expenses).where(isNotNull(expenses.shop)).orderBy(asc(expenses.shop)),
  ]);

  return NextResponse.json({
    categories: cats.map((r) => r.v).filter(Boolean),
    subcategories: subs.map((r) => r.v).filter(Boolean),
    shops: shops.map((r) => r.v).filter(Boolean),
  });
}
