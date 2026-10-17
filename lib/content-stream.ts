import { getMediumPosts } from "./sources/medium";
import { getThoughts } from "./sources/thoughts";
import { getReportItems } from "./sources/reports";

export type ContentItem =
  | { type: "medium"; title: string; url: string; date: string; excerpt: string; thumbnailUrl?: string; readingTime: number }
  | { type: "thought"; id: string; text: string; date: string; imageUrl?: string }
  | { type: "report"; slug: string; title: string; summary?: string; datasetLabel: string; date: string }
  | { type: "youtube"; url: string; title: string; date: string };

export async function getContentStream(): Promise<ContentItem[]> {
  const [medium, thoughts, reports] = await Promise.all([
    getMediumPosts(),
    getThoughts(),
    getReportItems(),
  ]);

  return [...medium, ...thoughts, ...reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
