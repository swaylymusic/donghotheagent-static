import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const site = "https://donghotheagent.com";
const feedTitle = "Dongho Lee Real Estate Blog";
const feedDescription =
  "Ontario and Toronto real estate guidance for families, newcomers, investors, buyers, and sellers.";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const prerender = true;

export const GET: APIRoute = async () => {
  const now = new Date();
  const posts = (await getCollection("blog"))
    .filter((post) => !post.data.draft && post.data.pubDate <= now)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .slice(0, 20);

  const latestPublication = posts[0]?.data.pubDate ?? now;
  const items = posts
    .map((post) => {
      const url = new URL(`/${post.slug}/`, site).toString();
      const publicationDate = post.data.pubDate.toUTCString();
      const updatedDate = (post.data.updatedDate ?? post.data.pubDate).toUTCString();

      return `  <item>
    <title>${escapeXml(post.data.title)}</title>
    <link>${escapeXml(url)}</link>
    <guid isPermaLink="true">${escapeXml(url)}</guid>
    <description>${escapeXml(post.data.description)}</description>
    <pubDate>${publicationDate}</pubDate>
    <lastBuildDate>${updatedDate}</lastBuildDate>
    <category>${escapeXml(post.data.category)}</category>
  </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${feedTitle}</title>
    <link>${site}/</link>
    <description>${feedDescription}</description>
    <language>ko</language>
    <lastBuildDate>${latestPublication.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
};
