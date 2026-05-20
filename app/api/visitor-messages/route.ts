import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visitorMessages } from "@/lib/schema";
import { notifyVisitorMessage } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

  const senderHandle =
    typeof body.senderHandle === "string" && body.senderHandle.trim()
      ? body.senderHandle.trim()
      : null;

  await db.insert(visitorMessages).values({ message, senderHandle });

  await notifyVisitorMessage({ message, senderHandle }).catch((err) =>
    console.error("[email] visitor message notification failed:", err)
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
