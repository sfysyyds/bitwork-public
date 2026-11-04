import { isExternalImage } from "./snapshot-public-resources.mjs";
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
const cache=path.join(root,".cache/public-media/optimized"),configHash=createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex"),cacheEntries=new Set(),cacheFiles=new Set();
await mkdir(cache,{recursive:true});
let originalBytes = 0, previewBytes = 0, cacheHits=0;
for (const url of urls) {
  if (isExternalImage(url)) continue;
  if (!/^\/media\/[a-f0-9-]+-(?:cover|shot-\d+)-[a-f0-9]{16}\.(?:jpg|png|webp|gif|avif)$/i.test(url)) throw new Error("Unexpected approved image path.");
  const bytes = await readFile(path.join(root, "public", url.slice(1)));
  const key=createHash("sha256").update(url).update(bytes).update(configHash).digest("hex");cacheEntries.add(key+".json");
  let hit;
  try {
    const entry=JSON.parse(await readFile(path.join(cache,key+".json"),"utf8"));
    const files=Object.entries(entry.files);
    if(!Number.isSafeInteger(entry.image?.width)||!Number.isSafeInteger(entry.image?.height)||entry.image.width<=0||entry.image.height<=0||entry.image.width*entry.image.height>40000000||!Array.isArray(entry.image.variants))throw Error("invalid cache geometry");
    for(const address of [...entry.image.variants.map(v=>v.url),entry.image.fullUrl].filter(Boolean))if(typeof address!=="string"||!address.startsWith("/media/")||!Object.hasOwn(entry.files,address.slice(7)))throw Error("invalid cached image URL");
    for(const [name,want] of files)if(!/^[a-f0-9-]{36}-(?:cover|shot-\d+)-[a-f0-9]{16}-(?:w\d+|full)-[a-f0-9]{12}\.webp$/i.test(name)||!/^[a-f0-9]{64}$/.test(want))throw Error("invalid cache file");
    for(const [name,want] of files){if(path.basename(name)!==name)throw Error("invalid cache path");const data=await readFile(path.join(cache,name));if(createHash("sha256").update(data).digest("hex")!==want)throw Error("invalid cache bytes");}
    for(const [name] of files){await writeFile(path.join(root,"public/media",name),await readFile(path.join(cache,name)));active.add(name);cacheFiles.add(name);}
    hit=entry.image;
  }catch{}
  if(hit){images[url]=hit;originalBytes+=bytes.length;const preview=hit.variants.find(v=>v.width>=960)||hit.variants.at(-1);previewBytes+=preview?(await readFile(path.join(root,"public",preview.url.slice(1)))).length:bytes.length;cacheHits++;continue;}
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
  const files={};
  for(const address of [...image.variants.map(v=>v.url),image.fullUrl].filter(Boolean)){const name=path.basename(address),data=await readFile(path.join(root,"public",address.slice(1)));await writeFile(path.join(cache,name),data);files[name]=createHash("sha256").update(data).digest("hex");cacheFiles.add(name);}
  await writeFile(path.join(cache,key+".json"),JSON.stringify({image,files}));
  images[url] = image;
  originalBytes += bytes.length;
  const preview = image.variants.find(variant => variant.width >= 960) || image.variants.at(-1);
  previewBytes += preview ? (await readFile(path.join(root, "public", preview.url.slice(1)))).length : bytes.length;
}
// Remove only our fingerprinted derivatives, never uploads/original images.
for (const file of await readdir(path.join(root, "public/media"))) {
  if (/^[a-f0-9-]{36}-(?:cover|shot-\d+)-[a-f0-9]{16}-(?:w\d+|full)-[a-f0-9]{12}\.webp$/i.test(file) && !active.has(file)) await rm(path.join(root, "public/media", file));
}
for(const file of await readdir(cache))if((/^[a-f0-9]{64}\.json$/.test(file)&&!cacheEntries.has(file))||(/^[a-f0-9-]{36}-(?:cover|shot-\d+)-[a-f0-9]{16}-(?:w\d+|full)-[a-f0-9]{12}\.webp$/i.test(file)&&!cacheFiles.has(file)))await rm(path.join(cache,file));
await writeFile(path.join(root, "src/data/images.json"), JSON.stringify(images));
console.log(JSON.stringify({ optimizedImages: Object.keys(images).length, originalBytes, previewBytes, originalsPreserved: true, cacheHits, encodedImages:Object.keys(images).length-cacheHits }));
