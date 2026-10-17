"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Report } from "@/lib/reports";

export type ReportCardData = Report & { dateLabel: string };

type DatasetOption = { key: string; label: string; count: number };

export default function ReportBrowser({
  reports,
  datasets,
}: {
  reports: ReportCardData[];
  datasets: DatasetOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const dataset = params.get("dataset");

  function updateParams(next: { q?: string; dataset?: string | null }) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return reports.filter((r) => {
      if (dataset && r.dataset !== dataset) return false;
      const haystack = [r.title, r.summary ?? "", r.datasetLabel].join(" ").toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [reports, dataset, query]);

  if (reports.length === 0) {
    return <p className="text-muted text-sm">No reports yet. Check back soon.</p>;
  }

  const chip = (active: boolean) =>
    `shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
      active
        ? "bg-accent border-accent text-white"
        : "bg-surface border-border text-muted hover:text-text"
    }`;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-10">
        <label className="relative md:w-80 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              updateParams({ q: e.target.value.trim() });
            }}
            placeholder="Search reports"
            className="w-full pl-10 pr-4 py-2.5 rounded-[14px] bg-surface border border-border text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors duration-200"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">
          <button className={chip(!dataset)} onClick={() => updateParams({ dataset: null })}>
            All <span className="font-mono opacity-70">{reports.length}</span>
          </button>
          {datasets.map((d) => (
            <button
              key={d.key}
              className={chip(dataset === d.key)}
              onClick={() => updateParams({ dataset: dataset === d.key ? null : d.key })}
            >
              {d.label} <span className="font-mono opacity-70">{d.count}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted text-sm">No reports match that search.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((r) => (
            <ReportCard key={r.slug} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report: r }: { report: ReportCardData }) {
  return (
    <Link
      href={`/reports/${r.slug}`}
      className="group rounded-[20px] bg-surface border border-border p-7 flex flex-col gap-3 hover:border-accent/40 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="accent">{r.datasetLabel}</Badge>
        <span className="text-[10px] font-mono text-muted">{r.dateLabel}</span>
      </div>
      <h2 className="text-lg font-bold font-heading tracking-tight text-text leading-snug group-hover:text-accent transition-colors duration-200">
        {r.title}
      </h2>
      {r.summary && <p className="text-sm text-muted leading-relaxed">{r.summary}</p>}
      <span className="mt-auto pt-1 text-xs text-accent">View report →</span>
    </Link>
  );
}
