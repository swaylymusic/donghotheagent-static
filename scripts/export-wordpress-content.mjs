import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const inventoryPath = path.join(root, "docs", "content-inventory.md");
const outDir = path.join(root, "migration-drafts", "blog");
const pageOutDir = path.join(root, "migration-drafts", "pages");
const manifestPath = path.join(root, "migration-drafts", "wordpress-content-export.json");

const inventory = await readFile(inventoryPath, "utf8");

function decodeEntities(text = "") {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8230;/g, "...");
}

function stripTags(html = "") {
  return decodeEntities(html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function frontmatterString(value = "") {
  return JSON.stringify(decodeEntities(value).replace(/\r?\n/g, " ").trim());
}

function arrayValue(value = "") {
  if (!value || value === "Uncategorized") return "[]";
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return `[${parts.map(frontmatterString).join(", ")}]`;
}

function slugFromUrl(url) {
  const parsed = new URL(url);
  const clean = parsed.pathname.replace(/^\/+|\/+$/g, "");
  return clean || "home";
}

function fileSafeSlug(slug) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

function extractTitle(html, fallback) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return stripTags(title[1]).replace(/\s+-\s+(?:Dongho, The Agent|Dongho Lee Real Estate)$/i, "");
  return fallback;
}

function extractMainHtml(html) {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (article) return article[1].trim();

  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (main) return main[1].trim();

  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return (body?.[1] || html).trim();
}

function cleanContent(html) {
  return normalizeImages(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, "")
    .replace(/<img\b[^>]*secure\.gravatar\.com[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\sdata-[a-z0-9_-]+=(["'])[\s\S]*?\1/gi, "")
    .replace(/\saria-[a-z0-9_-]+=(["'])[\s\S]*?\1/gi, "")
    .replace(/\sclass=(["'])[\s\S]*?\1/gi, "")
    .replace(/\sid=(["'])[\s\S]*?\1/gi, "")
    .replace(/\sstyle=(["'])[\s\S]*?\1/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function attrValue(tag, attr) {
  const match = tag.match(new RegExp(`\\s${attr}=["']([^"']+)["']`, "i"));
  return match?.[1] || "";
}

function srcFromSrcset(srcset = "") {
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean)
    .find((src) => src.includes("/wp-content/uploads/")) || "";
}

function bestImageSrc(tag) {
  const src = (
    attrValue(tag, "data-src") ||
    attrValue(tag, "data-lazy-src") ||
    attrValue(tag, "data-original") ||
    srcFromSrcset(attrValue(tag, "data-srcset")) ||
    srcFromSrcset(attrValue(tag, "srcset")) ||
    attrValue(tag, "src")
  );
  return absoluteUrl(src);
}

function absoluteUrl(src = "") {
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("/")) return `https://donghotheagent.com${src}`;
  return src;
}

function normalizeImages(html) {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = bestImageSrc(tag);
    if (!src || src.startsWith("data:")) return tag;
    if (/\ssrc=["'][^"']*["']/i.test(tag)) {
      return tag.replace(/\ssrc=["'][^"']*["']/i, ` src="${src}"`);
    }
    return tag.replace(/<img/i, `<img src="${src}"`);
  });
}

function extractImages(html) {
  const normalized = normalizeImages(html);
  return Array.from(normalized.matchAll(/<img\b[^>]*>/gi))
    .map((match) => bestImageSrc(match[0]))
    .filter((src) => src.includes("/wp-content/uploads/"))
    .filter((src) => !src.startsWith("data:"))
    .filter((src, index, all) => all.indexOf(src) === index);
}

function parseRows(sectionName) {
  const start = inventory.indexOf(`## ${sectionName}`);
  if (start === -1) return [];
  const rest = inventory.slice(start);
  const end = rest.indexOf("\n## ", 5);
  const section = end === -1 ? rest : rest.slice(0, end);
  return section
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.includes(" --- "))
    .slice(1)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim().replace(/^`|`$/g, "")));
}

const postRows = parseRows("Blog Posts").map(([date, title, categories, url]) => ({
  date,
  title,
  categories,
  url,
  slug: slugFromUrl(url),
}));

const pageRows = parseRows("Pages").map(([title, status, url, target]) => ({
  title,
  status,
  url,
  target,
  slug: slugFromUrl(url),
}));

await mkdir(outDir, { recursive: true });
await mkdir(pageOutDir, { recursive: true });

const exported = [];
const exportedPages = [];

for (const post of postRows) {
  const response = await fetch(post.url);
  if (!response.ok) {
    exported.push({ ...post, ok: false, status: response.status });
    continue;
  }

  const html = await response.text();
  const title = extractTitle(html, post.title);
  const description =
    extractMeta(html, "description") ||
    extractMeta(html, "og:description") ||
    "";
  const ogImage = extractMeta(html, "og:image");
  const rawMainHtml = extractMainHtml(html);
  const images = extractImages(rawMainHtml);
  const mainHtml = cleanContent(rawMainHtml);
  const excerpt = description || stripTags(mainHtml).slice(0, 180);
  const slug = fileSafeSlug(post.slug);
  const filename = `${slug}.md`;

  const markdown = `---\n` +
    `title: ${frontmatterString(title)}\n` +
    `description: ${frontmatterString(excerpt)}\n` +
    `pubDate: ${frontmatterString(post.date)}\n` +
    `category: ${frontmatterString(post.categories.split(",")[0]?.trim() || "Blog")}\n` +
    `tags: ${arrayValue(post.categories)}\n` +
    `draft: true\n` +
    `originalUrl: ${frontmatterString(post.url)}\n` +
    `featuredImage: ${frontmatterString(ogImage || images[0] || "")}\n` +
    `---\n\n` +
    `<!-- Migrated draft from WordPress. Review formatting and image paths before publishing. -->\n\n` +
    mainHtml +
    `\n`;

  await writeFile(path.join(outDir, filename), markdown, "utf8");
  exported.push({
    ...post,
    ok: true,
    title,
    description: excerpt,
    ogImage,
    images,
    filename: path.join("migration-drafts", "blog", filename).replace(/\\/g, "/"),
  });
}

for (const page of pageRows) {
  const response = await fetch(page.url);
  if (!response.ok) {
    exportedPages.push({ ...page, ok: false, statusCode: response.status });
    continue;
  }

  const html = await response.text();
  const title = extractTitle(html, page.title);
  const description =
    extractMeta(html, "description") ||
    extractMeta(html, "og:description") ||
    "";
  const ogImage = extractMeta(html, "og:image");
  const rawMainHtml = extractMainHtml(html);
  const images = extractImages(rawMainHtml);
  const mainHtml = cleanContent(rawMainHtml);
  const slug = page.slug === "home" ? "index" : fileSafeSlug(page.slug);
  const filename = `${slug}.md`;

  const markdown = `---\n` +
    `title: ${frontmatterString(title)}\n` +
    `description: ${frontmatterString(description || stripTags(mainHtml).slice(0, 180))}\n` +
    `status: ${frontmatterString(page.status)}\n` +
    `originalUrl: ${frontmatterString(page.url)}\n` +
    `astroTarget: ${frontmatterString(page.target)}\n` +
    `featuredImage: ${frontmatterString(ogImage || images[0] || "")}\n` +
    `---\n\n` +
    `<!-- Migrated page draft from WordPress. Convert this into a native Astro page before publishing. -->\n\n` +
    mainHtml +
    `\n`;

  await writeFile(path.join(pageOutDir, filename), markdown, "utf8");
  exportedPages.push({
    ...page,
    ok: true,
    title,
    description,
    ogImage,
    images,
    filename: path.join("migration-drafts", "pages", filename).replace(/\\/g, "/"),
  });
}

await writeFile(manifestPath, JSON.stringify({ exportedAt: new Date().toISOString(), posts: exported, pages: exportedPages }, null, 2), "utf8");

const failures = exported.filter((item) => !item.ok);
const pageFailures = exportedPages.filter((item) => !item.ok);
console.log(`Exported ${exported.length - failures.length}/${exported.length} posts`);
console.log(`Exported ${exportedPages.length - pageFailures.length}/${exportedPages.length} pages`);
if (failures.length || pageFailures.length) {
  console.log(`Failures: ${[...failures, ...pageFailures].map((item) => `${item.statusCode || item.status} ${item.url}`).join("; ")}`);
}
console.log(`Manifest: ${manifestPath}`);
