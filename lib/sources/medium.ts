import { XMLParser } from "fast-xml-parser";
import type { ContentItem } from "../content-stream";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

function trimExcerpt(text: string, maxLen = 140): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function extractFirstImageUrl(html: string): string | undefined {
  const m = html.match(/src="(https:\/\/cdn-images[^"]+)"/);
  return m?.[1];
}

export async function getMediumPosts(): Promise<ContentItem[]> {
  try {
    const res = await fetch("https://medium.com/feed/@nfrimando", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);

    const items: Record<string, unknown>[] =
      parsed?.rss?.channel?.item ?? [];

    return items.map((item) => {
      const encodedContent = String((item as Record<string, unknown>)["content:encoded"] ?? "");
      return {
        type: "medium" as const,
        title: String(item.title ?? ""),
        url: String(item.link ?? ""),
        date: item.pubDate ? new Date(String(item.pubDate)).toISOString() : new Date(0).toISOString(),
        excerpt: trimExcerpt(stripHtml(String(item.description ?? ""))),
        thumbnailUrl: extractFirstImageUrl(encodedContent),
        readingTime: Math.max(1, Math.ceil(stripHtml(encodedContent).trim().split(/\s+/).length / 200)),
      };
    });
  } catch {
    return [];
  }
}
