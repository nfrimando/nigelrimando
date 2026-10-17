import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Badge from "@/components/ui/Badge";
import { datasetInfo, formatReportDate, getReport, getReports } from "@/lib/reports";

export const dynamicParams = false;

export function generateStaticParams() {
  return getReports().map((r) => ({ slug: r.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const report = getReport((await params).slug);
  if (!report) return {};
  const url = `https://nigelrimando.com/reports/${report.slug}`;
  return {
    title: `${report.title} — Nigel Rimando`,
    description: report.summary ?? `${report.datasetLabel} report`,
    alternates: { canonical: url },
    openGraph: { title: report.title, description: report.summary, url, type: "article" },
    twitter: { card: "summary", title: report.title, description: report.summary },
  };
}

export default async function ReportPage({ params }: Props) {
  const report = getReport((await params).slug);
  if (!report) notFound();

  const dataset = datasetInfo(report.dataset);
  const rawHref = `/reports/${report.slug}.html`;
  const related = getReports()
    .filter((r) => r.dataset === report.dataset && r.slug !== report.slug)
    .slice(0, 3);

  return (
    <>
      <Nav />
      <main className="pt-24 pb-16">
        <header className="max-w-[1200px] mx-auto px-4 sm:px-6 mb-6">
          <Link
            href="/reports"
            className="text-xs font-mono text-muted hover:text-text transition-colors duration-200"
          >
            ← All reports
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-5 mb-3">
            <Link href={`/reports?dataset=${report.dataset}`}>
              <Badge variant="accent">{dataset.label}</Badge>
            </Link>
            <span className="text-xs font-mono text-muted">{formatReportDate(report.date)}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-heading tracking-tight text-text max-w-[760px] mb-3">
            {report.title}
          </h1>
          {report.summary && (
            <p className="text-muted leading-relaxed max-w-[760px]">{report.summary}</p>
          )}
          <div className="mt-4 text-xs font-mono">
            <a
              href={rawHref}
              target="_blank"
              rel="noopener"
              className="text-accent hover:text-accent-hover transition-colors duration-200"
            >
              Open full screen ↗
            </a>
          </div>
        </header>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          {/* No allow-same-origin: report scripts can't touch the site's cookies or admin APIs. */}
          <iframe
            src={rawHref}
            title={report.title}
            sandbox="allow-scripts allow-popups"
            className="w-full h-[calc(100svh-7rem)] min-h-[480px] rounded-[20px] border border-border bg-surface"
          />
        </div>

        {(related.length > 0 || dataset.journalHref) && (
          <section className="max-w-[1200px] mx-auto px-4 sm:px-6 mt-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted font-mono block mb-5">
              More from {dataset.label}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/reports/${r.slug}`}
                  className="group rounded-[20px] bg-surface border border-border p-6 flex flex-col gap-2 hover:border-accent/40 transition-colors duration-200"
                >
                  <span className="text-[10px] font-mono text-muted">
                    {formatReportDate(r.date)}
                  </span>
                  <span className="font-bold font-heading tracking-tight text-text leading-snug group-hover:text-accent transition-colors duration-200">
                    {r.title}
                  </span>
                </Link>
              ))}
            </div>
            {dataset.journalHref && (
              <Link
                href={dataset.journalHref}
                className="inline-block mt-6 text-sm text-accent hover:text-accent-hover transition-colors duration-200"
              >
                See the live {dataset.label.toLowerCase()} journal →
              </Link>
            )}
          </section>
        )}
      </main>
    </>
  );
}
