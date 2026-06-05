"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import ExercisesSection from "./ExercisesSection";
import SetsSection from "./SetsSection";
import PadelSetsSection from "./PadelSetsSection";
import PersonsSection from "./PersonsSection";
import ThoughtsSection from "./ThoughtsSection";
import InteractionsSection from "./InteractionsSection";
import TransportsSection from "./TransportsSection";
import ExpensesSection from "./ExpensesSection";
import HabitsSection from "./HabitsSection";
import HabitEntriesSection from "./HabitEntriesSection";
import VisitorMessagesSection from "./VisitorMessagesSection";

const DAILY_TABS = ["Sets", "Padel Sets", "Thoughts", "Interactions", "Transports", "Expenses", "Habit Entries", "Messages"] as const;
const SETUP_TABS = ["Exercises", "Persons", "Habits"] as const;
const ALL_TABS = [...DAILY_TABS, ...SETUP_TABS] as const;

type Tab = (typeof ALL_TABS)[number];

function isValidTab(t: string | null): t is Tab {
  return ALL_TABS.includes(t as Tab);
}

export default function AdminShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = isValidTab(tabParam) ? tabParam : "Sets";

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
            <Link
              href="/admin/analysis"
              className="text-xs px-3 py-1 rounded-[14px] border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors"
            >
              Analysis
            </Link>
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
        <nav className="mb-8 space-y-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-6 px-6 sm:mx-0 sm:px-0">
            {DAILY_TABS.map((tab) => (
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
          </div>
          <div className="flex gap-1 items-center overflow-x-auto scrollbar-none -mx-6 px-6 sm:mx-0 sm:px-0">
            <span className="text-[10px] font-medium text-[var(--text-muted)] opacity-40 shrink-0 uppercase tracking-widest pr-2 mr-1 border-r border-[var(--border)]">Setup</span>
            {SETUP_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                className={`px-3 py-1 rounded-[10px] text-xs font-medium transition-colors shrink-0 ${
                  activeTab === tab
                    ? "bg-[var(--accent)] text-white opacity-80"
                    : "text-[var(--text-muted)] opacity-50 hover:opacity-100 hover:bg-[var(--surface-alt)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "Exercises" && <ExercisesSection />}
        {activeTab === "Sets" && <SetsSection />}
        {activeTab === "Padel Sets" && <PadelSetsSection />}
        {activeTab === "Persons" && <PersonsSection />}
        {activeTab === "Thoughts" && <ThoughtsSection />}
        {activeTab === "Interactions" && <InteractionsSection />}
        {activeTab === "Transports" && <TransportsSection />}
        {activeTab === "Expenses" && <ExpensesSection />}
        {activeTab === "Habits" && <HabitsSection />}
        {activeTab === "Habit Entries" && <HabitEntriesSection />}
        {activeTab === "Messages" && <VisitorMessagesSection />}
      </div>
    </div>
  );
}
