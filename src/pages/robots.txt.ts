const site = "https://donghotheagent.com";

export function GET() {
  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}
