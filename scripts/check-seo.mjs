import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(process.argv[2] || path.join(root, "dist"));
const { items } = JSON.parse(await readFile(process.argv[3] || path.join(root, "src/data/resources.json"), "utf8"));
const origin = "https://bitwork.top";
const base = process.env.PAGES_BASE_PATH || "/bitwork-public/";
const decode = value => value.replace(/&(?:amp|lt|gt|quot|#39|#x27);/g, entity => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'" })[entity]);
const normalized = value => value.replace(/\s+/g, " ").trim();
const routes = ["", "resources/", ...items.map(item => `resources/${item.id}/`)];
try {
  const robots = await readFile(path.join(dist, "robots.txt"), "utf8");
  assert.match(robots, /User-agent: \*\nAllow: \/\n/);
  assert.ok(robots.includes(`Sitemap: ${origin}${base}sitemap.xml`));
  assert.doesNotMatch(robots, /^Disallow:\s*\/\s*$/m);
  const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
  assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1])).sort(), routes.map(route => origin + base + route).sort());
  const titles = [];
  for (const route of routes) {
    const html = await readFile(path.join(dist, route, "index.html"), "utf8");
    const head = html.split("</head>")[0];
    assert.equal([...head.matchAll(/rel="canonical"/g)].length, 1);
    assert.ok(head.includes(`href="${origin}${base}${route}"`));
    assert.match(head, /name="description" content="[^"]+"/);
    assert.match(head, /name="robots" content="index, follow, max-image-preview:large"/);
    assert.doesNotMatch(head, /noindex|nofollow/i);
    titles.push(decode(head.match(/<title>(.*?)<\/title>/s)?.[1] || ""));
    assert.ok(titles.at(-1));
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    assert.equal(ld.length, 1);
    assert.doesNotMatch(ld[0][1], /</);
    assert.equal(JSON.parse(ld[0][1])["@context"], "https://schema.org");
    assert.match(html, /id="root" data-prerendered="true"/);
    const body = html.split("</head>")[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
    const text = normalized(decode(body.replace(/<[^>]*>/g, " ")));
    assert.match(text, /THE NEW BIT/);
    assert.doesNotMatch(body, /<script\b/i);
    const item = items.find(item => route === `resources/${item.id}/`);
    if (item) {
      assert.ok(text.includes(normalized(item.title)));
      assert.ok(titles.at(-1).includes(item.title));
      if (item.intro?.trim()) assert.ok(text.includes(normalized(item.intro)));
    }
  }
  assert.equal(new Set(titles).size, routes.length);
  const dirs = (await readdir(path.join(dist, "resources"), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
  assert.deepEqual(dirs, items.map(item => item.id).sort());
  console.log(JSON.stringify({ status: "PASS", pages: routes.length, robots: true, sitemap: "approved-only", nativeBody: true, uniqueMetadata: true, structuredData: true }));
} catch (error) {
  console.log(JSON.stringify({ status: "FAIL", error: error.message, code: error.code || null }));
  process.exitCode = 1;
}
