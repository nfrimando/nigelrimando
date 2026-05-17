import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { sessionOptions, SessionData } from "@/lib/session";
import AdminShell from "./AdminShell";

export default async function AdminPage() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <Suspense>
      <AdminShell />
    </Suspense>
  );
}
