import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { sessionOptions, SessionData } from "@/lib/session";
import AnalysisShell from "./AnalysisShell";

export default async function AnalysisPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <Suspense>
      <AnalysisShell />
    </Suspense>
  );
}
