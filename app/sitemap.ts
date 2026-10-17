import type { MetadataRoute } from "next";
import { getReports } from "@/lib/reports";

const BASE = "https://nigelrimando.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const reports = getReports();
  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE}/reports`,
      lastModified: reports[0] ? new Date(reports[0].date) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...reports.map((r) => ({
      url: `${BASE}/reports/${r.slug}`,
      lastModified: new Date(r.date),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
