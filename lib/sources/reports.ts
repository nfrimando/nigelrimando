import type { ContentItem } from "../content-stream";
import { getReports } from "../reports";

export async function getReportItems(): Promise<ContentItem[]> {
  return getReports().map((r) => ({
    type: "report",
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    datasetLabel: r.datasetLabel,
    date: r.date,
  }));
}
