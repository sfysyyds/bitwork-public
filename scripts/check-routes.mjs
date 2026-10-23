import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.join(root, ".vite-cache/routes.mjs");
await build({
  entryPoints: [path.join(root, "src/App.tsx")], outfile, bundle: true,
  platform: "node", format: "esm", jsx: "automatic", packages: "external",
  loader: { ".css": "empty", ".ttf": "file" },
  define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.VITE_WORKBENCH_HOST": '"https://work.bitwork.top"', __SITE_UPDATED_AT__: '"2026-10-22T00:00:00Z"' },
});
const { default: App } = await import(pathToFileURL(outfile).href);
const { items } = JSON.parse(await readFile(path.join(root, "src/data/resources.json"), "utf8"));
for (const pathname of ["/", "/resources", "/resources/", "/not-found", "/resources/%E0%A4%A/", "/resources/not-a-real-id/", ...items.map(item => `/resources/${item.id}/`)]) {
  const html = renderToStaticMarkup(createElement(App, { pathname }));
  const catalog = /^\/resources\/?$/.test(pathname);
  const missing = ["/not-found", "/resources/%E0%A4%A/", "/resources/not-a-real-id/"].includes(pathname);
  assert.equal(html.includes('class="resources-list-heading"'), catalog, pathname);
  assert.equal(html.includes("未找到这项资源"), missing, pathname);
}
console.log(JSON.stringify({ routes: "PASS", validDetails: items.length, malformedAndUnknown: "not-found" }));
