import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const phase = process.argv[3] || "MODIFIED", baseline = phase === "BASELINE";
const helperPath = path.join(root, "src/resource-downloads.ts"), api = await import(pathToFileURL(helperPath).href), require = createRequire(path.join(root, "package.json"));
const url = "https://github.com/sfysyyds/bitwork-public/releases/download/test/patch.zip", route = api.downloadRoutes(url)[0];
let cases = 0;
async function observe(fetcher) { return (await api.measureDownloads([route], new AbortController().signal, undefined, fetcher))[0]; }
const ordinary200 = await observe(async () => new Response("patch", { status: 200, headers: { "Content-Type": "application/zip" } }));
const missing404 = await observe(async () => new Response("missing", { status: 404 }));
const cors = await observe(async () => { throw new TypeError("Failed to fetch"); });
const range206 = await observe(async () => new Response(new Uint8Array(8), { status: 206, headers: { "Content-Range": "bytes 0-7/8", "Content-Type": "application/zip" } }));
const timeout = await observe(async (_, init) => new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(new DOMException("timed out", "AbortError")), { once: true })));
if (baseline) {
  assert.equal(ordinary200.status, "unavailable");
  assert.equal(missing404.status, "unavailable");
  assert.equal(cors.status, "unavailable");
  assert.equal(timeout.status, "unavailable");
  cases += 4;
} else {
  assert.equal(ordinary200.status, "unmeasurable"); assert.match(ordinary200.message, /HTTP 200/);
  assert.equal(missing404.status, "http-error"); assert.equal(missing404.statusCode, 404);
  assert.equal(cors.status, "unmeasurable"); assert.match(cors.message, /仍可尝试下载/);
  assert.equal(timeout.status, "timeout"); assert.match(timeout.message, /超时/);
  assert.equal(range206.status, "ok"); assert.equal(api.downloadSpeed(undefined), "尚未测速");
  cases += 7;
}
assert.equal(range206.status, "ok"); cases++;

const actionsPath = path.join(root, "src/components/ResourceActions.tsx"), actionsSource = fs.readFileSync(actionsPath, "utf8");
const { build } = require("esbuild");
const entry = actionsPath, built = await build({ entryPoints: [entry], absWorkingDir: root, tsconfig: path.join(root, "tsconfig.json"), bundle: true, platform: "node", format: "cjs", packages: "external", write: false, jsx: "automatic", logLevel: "silent" });
const component = new Module(entry); component.filename = entry; component.paths = Module._nodeModulePaths(path.dirname(entry)); component._compile(built.outputFiles[0].text, entry);
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const props = { downloadUrl: url, gameUrl: "https://example.com/game", articleUrl: "https://www.bilibili.com/opus/123" };
const html = renderToStaticMarkup(React.createElement(component.exports.default, props));
assert.equal((html.match(/class="resource-download"/g) || []).length, 1); // one patch submenu button
assert.equal((html.match(/class="patch-download-route"/g) || []).length, 7);
assert(html.includes('href="https://example.com/game"') && html.includes("GHProxy") && html.includes("ghproxy.net"));
if (baseline) {
  assert(!/<noscript>/.test(html));
  assert(/async function open\(\)[\s\S]*?measureDownloads/.test(actionsSource));
  cases += 2;
} else {
  // The server-rendered href is a native download before hydration or after a JS failure.
  assert(html.includes(`<a class="resource-download" href="${url}"`));
  assert(!/<noscript>/.test(html));
  assert(/onClick=\{event => \{ event\.preventDefault\(\); void open\(\); \}\}/.test(actionsSource));
  assert(/function open\(\)\s*\{[^}]*showModal\(\);\s*\}/.test(actionsSource));
  assert(/onClick=\{\(\) => void testRoutes\(\)\}/.test(actionsSource));
  assert(actionsSource.includes("30_000") && actionsSource.includes("controller?.abort()"));
  assert(html.includes("补丁下载") && html.includes("游戏下载"));
  cases += 7;
}
cases += 3;

const articlePath = path.join(root, "src/components/ResourceArticle.tsx"), articleSource = fs.readFileSync(articlePath, "utf8");
const css = fs.readFileSync(path.join(root, "src/styles/resources.css"), "utf8");
const imageHelper = fs.readFileSync(path.join(root, "src/resource-images.ts"), "utf8");
require("postcss").parse(css);
require("esbuild").transformSync(articleSource, { loader: "tsx", jsx: "automatic" });
require("esbuild").transformSync(imageHelper, { loader: "ts" });
if (baseline) {
  assert(!articleSource.includes("onError=")); assert(!articleSource.includes("galleryTrigger.current?.focus()"));
  assert(css.includes("scrollbar-width:none;"));
  assert(!imageHelper.includes("showImageFallback"));
  assert(!css.includes('html[data-effects="off"] .resource-cover-pixels'));
  cases += 3;
} else {
  assert(articleSource.includes("onLoad=") && articleSource.includes("onError="));
  assert(articleSource.includes("function retryShot()") && articleSource.includes(">重试</button>"));
  assert(articleSource.includes("打开原图（新标签页）") && articleSource.includes("aria-live=\"polite\""));
  assert(articleSource.includes("imageRequest.current === currentImageRequest") && articleSource.includes("galleryTrigger.current?.focus()"));
  assert(articleSource.includes("页面目录（窄屏可横向滚动）"));
  assert(css.includes("font-size:11px;margin-bottom:4px") && css.includes(".resource-facts dt{font-size:11px;}.resource-facts dd{font-size:12px;}"));
  assert(css.includes(".resources-card-meta{font-size:11px;}"));
  assert(css.includes("scrollbar-width:thin;") && !css.includes(".resource-toc::-webkit-scrollbar{display:none;}"));
  assert(imageHelper.includes("function showImageFallback") && imageHelper.includes("image.dataset.failed = \"true\""));
  assert(imageHelper.includes("image.removeAttribute(\"srcset\")") && imageHelper.includes("image.src = failedImage"));
  assert(css.includes(".resources-card-cover{position:relative;display:grid;place-items:center;overflow:hidden;background:#151519;}") && css.includes('.resource-cover-pixels[data-failed="true"]{display:none;}'));
  assert(css.includes('html[data-effects="off"] .resource-cover-pixels{display:none;}'));
  cases += 13;
}

console.log(JSON.stringify({ phase, passed: true, cases, sameInput: { url, ordinaryHttp: 200, missingHttp: 404, rangeHttp: 206, cors: true, timeout: true }, measurements: { http200: ordinary200.status, http404: missing404.status, cors: cors.status, range206: range206.status, timeout: timeout.status }, noNetwork: true, menu: "single patch submenu with direct route", proxyNamesAndDomains: html.includes("GHProxy") && html.includes("ghproxy.net"), directAnchorInSsr: html.includes(`<a class="resource-download" href="${url}"`), galleryStates: !baseline && articleSource.includes("onError="), externalImageFallback: !baseline && imageHelper.includes("showImageFallback"), sourceRoot: root }));
