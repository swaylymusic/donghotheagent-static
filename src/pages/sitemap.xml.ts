import { getCollection } from "astro:content";
import { blogCategories } from "../data/blogCategories";

const site = "https://donghotheagent.com";

const staticRoutes = [
  "/",
  "/about/",
  "/services/",
  "/blog/",
  "/contact/",
  "/privacy-policy/",
  "/terms-and-conditions/",
  "/cookie-policy/",
  "/disclaimer/",
  "/no-deal-is-too-small-every-deal-matters/",
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const normalizeDate = (date: Date) => date.toISOString().slice(0, 10);

export async function GET() {
  const posts = (await getCollection("blog")).filter((post) => !post.data.draft);

  const postRoutes = posts.flatMap((post) => [
    {
      path: `/${post.slug}/`,
      lastmod: normalizeDate(post.data.pubDate),
      priority: "0.8",
    },
    {
      path: `/blog/${post.slug}/`,
      lastmod: normalizeDate(post.data.pubDate),
      priority: "0.5",
    },
  ]);

  const categoryRoutes = blogCategories
    .filter((category) =>
      posts.some((post) => post.data.category === category.key),
    )
    .map((category) => ({
      path: `/category/${category.slug}/`,
      lastmod: normalizeDate(new Date()),
      priority: "0.6",
    }));

  const routes = [
    ...staticRoutes.map((path) => ({
      path,
      lastmod: normalizeDate(new Date()),
      priority: path === "/" ? "1.0" : "0.7",
    })),
    ...categoryRoutes,
    ...postRoutes,
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${escapeXml(new URL(route.path, site).toString())}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
