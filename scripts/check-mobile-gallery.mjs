import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { items } = JSON.parse(await readFile(path.join(root, "src/data/resources.json"), "utf8"));
for (const item of items) {
  const html = await readFile(path.join(root, "dist/resources", item.id, "index.html"), "utf8");
  if (item.screenshots.length) {
    assert.ok(html.includes(`aria-label="查看全部 ${item.screenshots.length} 张 CG"`));
    assert.ok(html.includes(`data-count="${item.screenshots.length}"`));
  } else assert.ok(!html.includes('class="resource-gallery-stack"'));
}
await mkdir(path.join(root, ".vite-cache"), { recursive: true });
const outfile = path.join(root, ".vite-cache/mobile-gallery-check.mjs");
await build({ absWorkingDir: root, stdin: { resolveDir: root, contents: 'export { default as ResourceArticle } from "./src/components/ResourceArticle.tsx";' }, outfile, bundle: true, platform: "node", format: "esm", jsx: "automatic", packages: "external", define: { "import.meta.env.BASE_URL": '"/"' } });
const { ResourceArticle } = await import(pathToFileURL(outfile).href);
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
for (const count of [0, 1, 8]) {
  const html = renderToStaticMarkup(createElement(ResourceArticle, { resource: { ...items[0], screenshots: Array.from({ length: count }, (_, i) => ({ url: `/media/fixture-${i}.png`, caption: `CG ${i + 1}` })) } }));
  assert.equal(html.includes('class="resource-gallery-stack"'), count > 0);
  assert.equal(html.includes('id="screenshots"'), count > 0);
  if (count) assert.ok(html.includes(`data-count="${count}"`));
}
console.log(JSON.stringify({ mobileGalleryStack: true, pages: items.length, screenshotCases: [0, 1, 8] }));
