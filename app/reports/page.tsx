import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "@/components/Nav";
import { formatReportDate, getReports } from "@/lib/reports";
import ReportBrowser, { type ReportCardData } from "./ReportBrowser";

export const metadata: Metadata = {
  title: "Reports — Nigel Rimando",
  description: "Deep dives into my own data: padel, gym, habits, e-bike trips, and expenses.",
  openGraph: {
    title: "Reports — Nigel Rimando",
    description: "Deep dives into my own data: padel, gym, habits, e-bike trips, and expenses.",
    url: "https://nigelrimando.com/reports",
  },
};

export default function ReportsPage() {
  const reports: ReportCardData[] = getReports().map((r) => ({
    ...r,
    dateLabel: formatReportDate(r.date),
  }));

  const datasets = [...new Set(reports.map((r) => r.dataset))].map((key) => {
    const matching = reports.filter((r) => r.dataset === key);
    return { key, label: matching[0].datasetLabel, count: matching.length };
  });

  return (
    <>
      <Nav />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-32 pb-24">
        <header className="max-w-[760px] mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted font-mono block mb-3">
            Reports
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight text-text mb-4">
            What my data says
          </h1>
          <p className="text-muted leading-relaxed">
            One-off deep dives into the datasets I track: padel, gym, habits, e-bike trips, and
            expenses.
          </p>
        </header>
        <Suspense>
          <ReportBrowser reports={reports} datasets={datasets} />
        </Suspense>
      </main>
    </>
  );
}
