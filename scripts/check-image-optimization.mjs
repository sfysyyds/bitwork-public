import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(process.argv[2] || ".");
const { items } = JSON.parse(await readFile(path.join(root, "src/data/resources.json"), "utf8"));
const images = JSON.parse(await readFile(path.join(root, "src/data/images.json"), "utf8"));
const urls = new Set(items.flatMap(item => [item.coverUrl, ...(item.screenshots || []).map(shot => shot.url)]).filter(Boolean));
assert.deepEqual(Object.keys(images).sort(), [...urls].sort(), "Every and only public cover/CG must be in the optimized manifest.");
let originalBytes = 0, previewBytes = 0, fullBytes = 0, rgbErrorTotal = 0, rgbSamples = 0, maxAlphaError = 0;
let variants = 0, fullImages = 0;

for (const url of urls) {
  const source = await readFile(path.join(root, "public", url.slice(1)));
  assert.ok(url.includes(createHash("sha256").update(source).digest("hex").slice(0, 16)), "Uploaded original must remain unchanged.");
  const image = images[url];
  const sourceInfo = await sharp(source, { limitInputPixels: 40000000 }).metadata();
  const sourceWidth = sourceInfo.orientation >= 5 ? sourceInfo.height : sourceInfo.width;
  const sourceHeight = sourceInfo.orientation >= 5 ? sourceInfo.width : sourceInfo.height;
  assert.equal(image.width, sourceWidth);
  assert.equal(image.height, sourceHeight);
  originalBytes += source.length;

  for (const variant of image.variants) {
    const outputPath = path.join(root, "public", variant.url.slice(1));
    const output = await readFile(outputPath);
    const actualInfo = await sharp(output).metadata();
    const resized = await sharp(source, { limitInputPixels: 40000000 }).rotate().resize({ width: variant.width, withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
    assert.equal(actualInfo.format, "webp");
    assert.equal(actualInfo.width, resized.info.width, "Preview width must match the uncropped resize.");
    assert.equal(actualInfo.height, resized.info.height, "Preview height must match the uncropped resize.");
    assert.ok(actualInfo.width <= image.width);
    assert.ok(output.length < source.length, "Keep only previews smaller than the untouched original.");
    variants++;
  }

  const preview = image.variants.find(variant => variant.width >= 960) || image.variants.at(-1);
  previewBytes += preview ? (await stat(path.join(root, "public", preview.url.slice(1)))).size : source.length;

  if (image.fullUrl) {
    const outputPath = path.join(root, "public", image.fullUrl.slice(1));
    const output = await readFile(outputPath);
    const actual = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const expected = await sharp(source, { limitInputPixels: 40000000 }).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal((await sharp(output).metadata()).format, "webp");
    assert.equal(actual.info.width, sourceWidth);
    assert.equal(actual.info.height, sourceHeight);
    assert.ok(output.length < source.length, "Keep only full-resolution files smaller than the original.");
    assert.equal(actual.info.width, expected.info.width);
    assert.equal(actual.info.height, expected.info.height);
    for (let i = 0; i < actual.data.length; i++) {
      const error = Math.abs(actual.data[i] - expected.data[i]);
      if (i % 4 === 3) maxAlphaError = Math.max(maxAlphaError, error);
      else { rgbErrorTotal += error; rgbSamples++; }
    }
    fullBytes += output.length;
    fullImages++;
  }
}

const rgbMae = rgbSamples ? rgbErrorTotal / rgbSamples : 0;
assert.ok(rgbMae <= 3, `Full-resolution RGB mean absolute error exceeded 3/255: ${rgbMae}`);
assert.equal(maxAlphaError, 0, "Full-resolution alpha must remain pixel-identical.");
console.log(JSON.stringify({ originals: Object.keys(images).length, variants, originalBytes, previewBytes, fullImages, fullBytes, rgbMae, maxAlphaError, originalsPreserved: true, naturalDimensions: true }));
