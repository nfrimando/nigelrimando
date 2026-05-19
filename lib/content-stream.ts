import { getMediumPosts } from "./sources/medium";
import { getThoughts } from "./sources/thoughts";

export type ContentItem =
  | { type: "medium"; title: string; url: string; date: string; excerpt: string; thumbnailUrl?: string; readingTime: number }
  | { type: "thought"; id: string; text: string; date: string; imageUrl?: string }
  | { type: "youtube"; url: string; title: string; date: string };

export async function getContentStream(): Promise<ContentItem[]> {
  const [medium, thoughts] = await Promise.all([
    getMediumPosts(),
    getThoughts(),
  ]);

  return [...medium, ...thoughts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
