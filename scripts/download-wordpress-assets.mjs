import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "migration-drafts", "wordpress-content-export.json");
const publicUploadsDir = path.join(root, "public", "uploads");
const contentDirs = [
  path.join(root, "migration-drafts", "blog"),
  path.join(root, "migration-drafts", "pages"),
  path.join(root, "src", "content", "blog"),
];

function localPathForUpload(urlText) {
  if (!urlText) return "";
  urlText = urlText.split(/[<>"'\s]/)[0].replace(/[)\]]+$/g, "");
  let url;
  try {
    url = new URL(urlText, "https://donghotheagent.com");
  } catch {
    return "";
  }

  const marker = "/wp-content/uploads/";
  const index = url.pathname.indexOf(marker);
  if (index === -1) return "";

  const relative = decodeURIComponent(url.pathname.slice(index + marker.length)).replace(/[<>"')\]]+$/g, "");
  return `/uploads/${relative}`;
}

async function walkMarkdownFiles(dir) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

function normalizeUploadUrl(urlText) {
  urlText = (urlText || "").split(/[<>"'\s]/)[0].replace(/[)\]]+$/g, "");
  if (urlText.startsWith("/wp-content/uploads/")) {
    return `https://donghotheagent.com${urlText}`;
  }
  return urlText;
}

async function collectAssetUrls() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const urls = new Set();

  for (const item of [...manifest.posts, ...manifest.pages]) {
    for (const candidate of [item.ogImage, item.featuredImage, ...(item.images || [])]) {
      const normalized = normalizeUploadUrl(candidate || "");
      if (localPathForUpload(normalized)) urls.add(normalized);
    }
  }

  for (const dir of contentDirs) {
    for (const file of await walkMarkdownFiles(dir)) {
      const text = await readFile(file, "utf8");
      for (const match of text.matchAll(/https:\/\/donghotheagent\.com\/wp-content\/uploads\/[^"'\s>)]+/g)) {
        urls.add(match[0]);
      }
      for (const match of text.matchAll(/\/wp-content\/uploads\/[^"'\s>)]+/g)) {
        urls.add(`https://donghotheagent.com${match[0]}`);
      }
    }
  }

  return [...urls].sort();
}

async function downloadAsset(urlText) {
  const localUrl = localPathForUpload(urlText);
  const destination = path.join(publicUploadsDir, localUrl.replace(/^\/uploads\//, ""));
  await mkdir(path.dirname(destination), { recursive: true });

  const response = await fetch(urlText);
  if (!response.ok) {
    return { ok: false, url: urlText, status: response.status, localUrl };
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, bytes);
  return { ok: true, url: urlText, localUrl, bytes: bytes.length };
}

async function rewriteMarkdownFiles(urls) {
  const replacements = new Map(urls.map((url) => [url, localPathForUpload(url)]));
  const relativeReplacements = new Map(
    urls.map((url) => {
      const parsed = new URL(url);
      return [parsed.pathname, localPathForUpload(url)];
    }),
  );

  let changed = 0;
  for (const dir of contentDirs) {
    for (const file of await walkMarkdownFiles(dir)) {
      let text = await readFile(file, "utf8");
      const original = text;

      for (const [from, to] of replacements) {
        text = text.split(from).join(to);
      }
      for (const [from, to] of relativeReplacements) {
        text = text.split(from).join(to);
      }

      if (text !== original) {
        await writeFile(file, text, "utf8");
        changed += 1;
      }
    }
  }
  return changed;
}

const urls = await collectAssetUrls();
const results = [];

for (const url of urls) {
  results.push(await downloadAsset(url));
}

const changedFiles = await rewriteMarkdownFiles(urls);
const failed = results.filter((item) => !item.ok);

await writeFile(
  path.join(root, "migration-drafts", "asset-download-report.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), assets: results, changedFiles }, null, 2),
  "utf8",
);

console.log(`Found ${urls.length} WordPress upload assets`);
console.log(`Downloaded ${results.length - failed.length}/${results.length}`);
console.log(`Rewrote ${changedFiles} markdown files`);
if (failed.length) {
  console.log(`Failures: ${failed.map((item) => `${item.status} ${item.url}`).join("; ")}`);
}
