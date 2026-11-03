import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { sessionOptions, SessionData } from "@/lib/session";
import JournalShell from "./JournalShell";

export default async function JournalPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <Suspense>
      <JournalShell />
    </Suspense>
  );
}
