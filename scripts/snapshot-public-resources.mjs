import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = "https://work.bitwork.top";
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"],
  ["image/gif", "gif"], ["image/avif", "avif"],
]);

function safeId(value) {
  if (typeof value !== "string" || !/^[a-f0-9-]{1,80}$/i.test(value)) throw new Error("Published resource has an unsafe id.");
  return value;
}

async function copyPublicImage(value, name) {
  if (!value) return "";
  const match = /^\/api\/resource-media\/([a-f0-9-]{36})$/i.exec(value);
  if (!match) throw new Error(`Refusing non-public or unexpected media URL: ${value}`);
  const response = await fetch(`${source}${value}`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Public image fetch failed (${response.status}): ${value}`);
  const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const extension = allowedImageTypes.get(mime);
  if (!extension) throw new Error(`Public media is not an allowed image type: ${mime || "missing content type"}`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > 20 * 1024 * 1024) throw new Error(`Image exceeds 20 MiB limit: ${value}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 20 * 1024 * 1024) throw new Error(`Image exceeds 20 MiB limit: ${value}`);
  const file = `${name}.${extension}`;
  await mkdir(path.join(root, "public", "media"), { recursive: true });
  await writeFile(path.join(root, "public", "media", file), bytes);
  return `/media/${file}`;
}

const response = await fetch(`${source}/api/resources`, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Published resources fetch failed (${response.status}).`);
const body = await response.json();
if (!Array.isArray(body.items)) throw new Error("The published resources endpoint did not return an items array.");

const items = [];
for (const row of body.items) {
  const id = safeId(row.id);
  const coverUrl = await copyPublicImage(row.coverUrl, `${id}-cover`);
  const screenshots = [];
  for (let index = 0; index < (Array.isArray(row.screenshots) ? row.screenshots.length : 0); index++) {
    const shot = row.screenshots[index];
    screenshots.push({
      url: await copyPublicImage(shot?.url, `${id}-shot-${index + 1}`),
      caption: typeof shot?.caption === "string" ? shot.caption : "",
    });
  }
  const downloadUrl = typeof row.downloadUrl === "string" ? row.downloadUrl : "";
  if (downloadUrl && new URL(downloadUrl).protocol !== "https:") throw new Error(`Refusing a non-HTTPS download link for ${id}.`);
  items.push({
    id,
    title: typeof row.title === "string" ? row.title : "",
    english: typeof row.english === "string" ? row.english : "",
    genre: typeof row.genre === "string" ? row.genre : "",
    version: typeof row.version === "string" ? row.version : "",
    intro: typeof row.intro === "string" ? row.intro : "",
    downloadUrl,
    coverUrl,
    screenshots,
    description: typeof row.description === "string" ? row.description : "",
    installation: typeof row.installation === "string" ? row.installation : "",
    changelog: typeof row.changelog === "string" ? row.changelog : "",
    credits: typeof row.credits === "string" ? row.credits : "",
  });
}

const manifest = {
  snapshotAt: new Date().toISOString(),
  items,
};
const manifestPath = path.join(root, "src", "data", "resources.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Saved ${items.length} explicitly public resource(s): ${manifestPath}`);

// Confirm the written snapshot contains only the approved public fields.
const written = JSON.parse(await readFile(manifestPath, "utf8"));
const allowed = new Set(["id", "title", "english", "genre", "version", "intro", "downloadUrl", "coverUrl", "screenshots", "description", "installation", "changelog", "credits"]);
for (const item of written.items) {
  if (Object.keys(item).some(key => !allowed.has(key))) throw new Error(`Unexpected manifest field in ${item.id}.`);
  if ([item.coverUrl, ...item.screenshots.map(shot => shot.url)].some(url => url.includes("/api/") || url.startsWith("http:"))) throw new Error(`Manifest still references API media in ${item.id}.`);
}
