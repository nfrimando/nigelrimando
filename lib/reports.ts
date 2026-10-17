import fs from "node:fs";
import path from "node:path";

// Reports are standalone HTML files dropped into public/reports/ and named
// <dataset>-<YYYYMMDD>[-<anything>].html (dashes in the date are optional). Title comes from <title>, the
// optional summary from <meta name="description">. See CLAUDE.md → Reports.

export const DATASET_LABELS: Record<string, { label: string; journalHref: string | null }> = {
  gym: { label: "Gym", journalHref: "/journal/sets" },
  padel: { label: "Padel", journalHref: "/journal/padel" },
  habits: { label: "Habits", journalHref: "/journal/habits" },
  ebike: { label: "E-bike", journalHref: "/journal/ebike" },
  expenses: { label: "Expenses", journalHref: null },
};

export function datasetInfo(key: string) {
  return DATASET_LABELS[key] ?? { label: key[0].toUpperCase() + key.slice(1), journalHref: null };
}

export type Report = {
  slug: string; // filename without .html
  title: string;
  summary?: string;
  dataset: string;
  datasetLabel: string;
  date: string; // YYYY-MM-DD (PH time)
};

const REPORTS_DIR = path.join(process.cwd(), "public", "reports");
const FILENAME_RE = /^([a-z0-9]+)-(\d{4})-?(\d{2})-?(\d{2})(-[a-z0-9-]+)?\.html$/;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&middot;/g, "·")
    .replace(/&mdash;/g, "—");
}

function parseReport(file: string): Report {
  const match = file.match(FILENAME_RE);
  if (!match) {
    throw new Error(
      `[reports] public/reports/${file}: name must be <dataset>-<YYYYMMDD>[-<anything>].html, lowercase (e.g. padel-20261017.html)`
    );
  }
  const [, dataset, y, m, d] = match;
  const date = `${y}-${m}-${d}`;
  const html = fs.readFileSync(path.join(REPORTS_DIR, file), "utf8");
  const { label } = datasetInfo(dataset);

  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = rawTitle
    ? decodeEntities(rawTitle.trim()).replace(/\s*[·—|-]\s*Nigel Rimando\s*$/i, "")
    : "";
  const rawSummary =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i)?.[1];

  return {
    slug: file.replace(/\.html$/, ""),
    title: title || `${label} report`,
    summary: rawSummary ? decodeEntities(rawSummary.trim()) : undefined,
    dataset,
    datasetLabel: label,
    date,
  };
}

let cache: Report[] | null = null;

export function getReports(): Report[] {
  if (cache) return cache;
  if (!fs.existsSync(REPORTS_DIR)) return (cache = []);

  const reports = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.toLowerCase().endsWith(".html"))
    .map(parseReport);

  return (cache = reports.sort(
    (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)
  ));
}

export function getReport(slug: string): Report | undefined {
  return getReports().find((r) => r.slug === slug);
}

// Formats a YYYY-MM-DD string without UTC drift.
export function formatReportDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
