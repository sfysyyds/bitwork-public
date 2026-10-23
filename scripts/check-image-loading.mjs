import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const fixed = process.argv.includes("--expect-fixed");
const { items } = JSON.parse(await readFile(path.join(root, "src/data/resources.json"), "utf8"));
let images = {};
try { images = JSON.parse(await readFile(path.join(root, "src/data/images.json"), "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
let originalBytes = 0, previewBytes = 0, mobileBytes = 0, optimized = 0, coverOriginal = 0, coverPreview = 0;
for (const item of items) {
  for (const url of [item.coverUrl, ...item.screenshots.map(shot => shot.url)].filter(Boolean)) {
    const original = await readFile(path.join(root, "public", url.slice(1))), image = images[url];
    assert.ok(url.includes(createHash("sha256").update(original).digest("hex").slice(0, 16)), "Original bytes must remain unchanged.");
    originalBytes += original.length;
    const preview = image?.variants.find(variant => variant.width >= 960) || image?.variants.at(-1);
    const bytes = preview ? (await stat(path.join(root, "public", preview.url.slice(1)))).size : original.length;
    previewBytes += bytes;
    mobileBytes += image?.variants[0] ? (await stat(path.join(root, "public", image.variants[0].url.slice(1)))).size : original.length;
    if (url === item.coverUrl) { coverOriginal += original.length; coverPreview += bytes; }
    if (image?.variants.length) {
      optimized++;
      for (const variant of image.variants) {
        const metadata = await sharp(path.join(root, "public", variant.url.slice(1))).metadata();
        assert.equal(metadata.format, "webp"); assert.equal(metadata.width, variant.width); assert.ok(metadata.width <= image.width);
      }
    }
  }
}
if (fixed) {
  assert.equal(Object.keys(images).length, new Set(items.flatMap(item => [item.coverUrl, ...item.screenshots.map(shot => shot.url)]).filter(Boolean)).size);
  assert.ok(previewBytes <= originalBytes, "Do not replace an image with a larger preview.");
  const html = await readFile(path.join(root, "dist/resources/index.html"), "utf8");
  if (optimized) { assert.match(html, /srcSet=|srcset=/i); assert.match(html, /fetchPriority="high"/i); assert.match(html, /decoding="async"/); }
  const source = await readFile(path.join(root, "src/components/ResourceArticle.tsx"), "utf8");
  assert.ok(source.includes("src={fullImageSrc(selectedShot.url)}"), "Lightbox must use the full-resolution optimized image when available.");
} else assert.equal(optimized, 0);
console.log(JSON.stringify({ phase: fixed ? "MODIFIED" : "BASELINE_OR_ROLLBACK", images: items.reduce((n,item)=>n+1+item.screenshots.length,0), optimized, originalBytes, previewBytes, mobileBytes, coverOriginal, coverPreview, originalsPreserved: true }));
