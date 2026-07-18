import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const prerender = true;

export const GET: APIRoute = async () => {
  const now = new Date();
  const posts = (await getCollection("blog"))
    .filter((post) => !post.data.draft && post.data.pubDate <= now)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .slice(0, 3)
    .map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate.toISOString(),
      category: post.data.category,
      url: `https://donghotheagent.com/${post.slug}/`,
      featuredImage: post.data.featuredImage
        ? new URL(post.data.featuredImage, "https://donghotheagent.com").href
        : null,
      imageAlt: post.data.imageAlt ?? post.data.title,
    }));

  return new Response(JSON.stringify({ posts }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
