"use client";

import { useSearchParams, useRouter } from "next/navigation";
import ExercisesSection from "./ExercisesSection";
import SetsSection from "./SetsSection";
import PadelSetsSection from "./PadelSetsSection";
import PersonsSection from "./PersonsSection";
import ThoughtsSection from "./ThoughtsSection";
import InteractionsSection from "./InteractionsSection";
import TransportsSection from "./TransportsSection";
import ExpensesSection from "./ExpensesSection";

const TABS = [
  "Exercises",
  "Sets",
  "Padel Sets",
  "Persons",
  "Thoughts",
  "Interactions",
  "Transports",
  "Expenses",
] as const;
type Tab = (typeof TABS)[number];

function isValidTab(t: string | null): t is Tab {
  return TABS.includes(t as Tab);
}

export default function AdminShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = isValidTab(tabParam) ? tabParam : "Exercises";

  function setTab(tab: Tab) {
    router.replace(`/admin?tab=${encodeURIComponent(tab)}`, { scroll: false });
  }

  async function handleSignOut() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-heading font-bold text-lg text-[var(--text)]">
              Admin
            </h1>
            <a
              href="/"
              className="text-xs px-3 py-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
            >
              ← Back to Home
            </a>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6">
        <nav className="flex gap-1 mb-8 overflow-x-auto scrollbar-none -mx-6 px-6 sm:mx-0 sm:px-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={`px-4 py-2 rounded-[14px] text-sm font-medium transition-colors shrink-0 ${
                activeTab === tab
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Exercises" && <ExercisesSection />}
        {activeTab === "Sets" && <SetsSection />}
        {activeTab === "Padel Sets" && <PadelSetsSection />}
        {activeTab === "Persons" && <PersonsSection />}
        {activeTab === "Thoughts" && <ThoughtsSection />}
        {activeTab === "Interactions" && <InteractionsSection />}
        {activeTab === "Transports" && <TransportsSection />}
        {activeTab === "Expenses" && <ExpensesSection />}
      </div>
    </div>
  );
}
