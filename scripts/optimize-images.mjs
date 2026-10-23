import { readFile, writeFile, readdir, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { items } = JSON.parse(await readFile(path.join(root, "src/data/resources.json"), "utf8"));
const urls = new Set(items.flatMap(item => [item.coverUrl, ...(item.screenshots || []).map(shot => shot.url)]).filter(Boolean));
const images = {}, active = new Set();
await mkdir(path.join(root, "public/media"), { recursive: true });
let originalBytes = 0, previewBytes = 0;
for (const url of urls) {
  if (!/^\/media\/[a-f0-9-]+-(?:cover|shot-\d+)-[a-f0-9]{16}\.(?:jpg|png|webp|gif|avif)$/i.test(url)) throw new Error("Unexpected approved image path.");
  const bytes = await readFile(path.join(root, "public", url.slice(1)));
  const metadata = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
  if (!metadata.width || !metadata.height) throw new Error("Cannot read approved image dimensions.");
  const image = { width: metadata.width, height: metadata.height, variants: [] };
  if (metadata.orientation && metadata.orientation >= 5) [image.width, image.height] = [image.height, image.width];
  // Animated originals keep their animation; no first-frame-only replacement.
  if ((metadata.pages || 1) === 1) {
    const widths = [...new Set([480, 960, 1600].map(width => Math.min(width, image.width)))];
    for (const width of widths) {
      const { data, info } = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toBuffer({ resolveWithObject: true });
      if (data.length >= bytes.length) continue;
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
      const file = `${path.basename(url, path.extname(url))}-w${width}-${hash}.webp`;
      await writeFile(path.join(root, "public/media", file), data);
      image.variants.push({ url: `/media/${file}`, width: info.width });
      active.add(file);
    }
    const { data, info } = await sharp(bytes, { limitInputPixels: 40000000 }).rotate().webp({ quality: 90, alphaQuality: 100, effort: 5 }).toBuffer({ resolveWithObject: true });
    if (data.length < bytes.length) {
      const hash = createHash("sha256").update(data).digest("hex").slice(0, 12);
      const file = `${path.basename(url, path.extname(url))}-full-${hash}.webp`;
      await writeFile(path.join(root, "public/media", file), data);
      image.fullUrl = `/media/${file}`;
      active.add(file);
    }
  }
  images[url] = image;
  originalBytes += bytes.length;
  const preview = image.variants.find(variant => variant.width >= 960) || image.variants.at(-1);
  previewBytes += preview ? (await readFile(path.join(root, "public", preview.url.slice(1)))).length : bytes.length;
}
// Remove only our fingerprinted derivatives, never uploads/original images.
for (const file of await readdir(path.join(root, "public/media"))) {
  if (/^[a-f0-9-]{36}-(?:cover|shot-\d+)-[a-f0-9]{16}-(?:w\d+|full)-[a-f0-9]{12}\.webp$/i.test(file) && !active.has(file)) await rm(path.join(root, "public/media", file));
}
await writeFile(path.join(root, "src/data/images.json"), JSON.stringify(images));
console.log(JSON.stringify({ optimizedImages: urls.size, originalBytes, previewBytes, originalsPreserved: true }));
