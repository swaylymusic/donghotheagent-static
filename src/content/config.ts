import { defineCollection, z } from "astro:content";

export const collections = {
  blog: defineCollection({
    type: "content",
    schema: z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      category: z.string(),
      tags: z.array(z.string()).optional(),
      featuredImage: z.string().optional(),
      imageAlt: z.string().optional(),
      originalUrl: z.string().optional(),
      draft: z.boolean().default(false),
    }),
  }),
};
