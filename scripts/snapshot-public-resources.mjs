import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = "https://work.bitwork.top";
const routeMarker = "<!-- generated public resource route; keep this file data-free -->";
const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"],
  ["image/gif", "gif"], ["image/avif", "avif"],
]);
const allowedFields = new Set([
  "id", "title", "english", "genre", "version", "intro", "downloadUrl", "gameUrl", "articleUrl", "coverUrl", "screenshots",
  "description", "installation", "changelog", "credits",
]);

export function safeId(value) {
  if (typeof value !== "string" || !/^[a-f0-9-]{1,80}$/i.test(value)) throw new Error("Published resource has an unsafe id.");
  return value;
}

export function toPublicResource(row, { coverUrl = "", screenshots = [] } = {}) {
  const downloadUrl = typeof row.downloadUrl === "string" ? row.downloadUrl : "";
  if (downloadUrl) { const url = new URL(downloadUrl); if (url.protocol !== "https:" || url.username || url.password) throw new Error(`Refusing an unsafe public download link for ${row.id}.`); }
  const gameUrl = typeof row.gameUrl === "string" ? row.gameUrl : "";
  if (gameUrl) { const url = new URL(gameUrl); if (url.protocol !== "https:" || url.username || url.password) throw new Error(`Invalid public game URL for ${row.id}.`); }
  const articleUrl = typeof row.articleUrl === "string" ? row.articleUrl : "";
  if (articleUrl) { const url = new URL(articleUrl); if (url.protocol !== "https:" || url.username || url.password) throw new Error(`Invalid public article link for ${row.id}.`); }
  return {
    id: safeId(row.id),
    title: typeof row.title === "string" ? row.title : "",
    english: typeof row.english === "string" ? row.english : "",
    genre: typeof row.genre === "string" ? row.genre : "",
    version: typeof row.version === "string" ? row.version : "",
    intro: typeof row.intro === "string" ? row.intro : "",
    downloadUrl,
    gameUrl,
    articleUrl,
    coverUrl,
    screenshots: screenshots.map(shot => ({ url: shot.url, caption: typeof shot.caption === "string" ? shot.caption : "" })),
    description: typeof row.description === "string" ? row.description : "",
    installation: typeof row.installation === "string" ? row.installation : "",
    changelog: typeof row.changelog === "string" ? row.changelog : "",
    credits: typeof row.credits === "string" ? row.credits : "",
  };
}

export async function pruneGeneratedArtifacts(siteRoot, activeIds, activeMedia) {
  const resourcesDir = path.join(siteRoot, "resources");
  for (const entry of await readdir(resourcesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || activeIds.has(entry.name) || !/^[a-f0-9-]{1,80}$/i.test(entry.name)) continue;
    const directory = path.join(resourcesDir, entry.name);
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.length !== 1 || entries[0].name !== "index.html" || !entries[0].isFile()) {
      throw new Error(`Refusing to publish with unrecognized stale route contents: ${directory}`);
    }
    const route = await readFile(path.join(directory, "index.html"), "utf8");
    if (!route.includes(routeMarker)) throw new Error(`Refusing to publish with an unrecognized stale route: ${directory}`);
    await rm(directory, { recursive: true, force: true });
  }

  const mediaDir = path.join(siteRoot, "public", "media");
  let mediaEntries;
  try { mediaEntries = await readdir(mediaDir, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const entry of mediaEntries) {
    if (!entry.isFile() || !/^[a-f0-9-]{36}-(?:cover|shot-\d+)(?:-[a-f0-9]{16})?\.(?:jpg|png|webp|gif|avif)$/i.test(entry.name)) continue;
    if (!activeMedia.has(`/media/${entry.name}`)) await rm(path.join(mediaDir, entry.name), { force: true });
  }
}

function getPublishId() {
  const value = process.env.PUBLISH_ID?.trim() || process.env.GITHUB_SHA?.trim() || randomUUID();
  if (!/^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value)) {
    throw new Error("PUBLISH_ID must be a UUID or Git commit SHA.");
  }
  return value;
}

async function fetchPublic(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: "error" });
      if (attempt || response.status < 500) return response;
      await response.body?.cancel();
    } catch (error) { if (attempt) throw error; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

export function isExternalImage(value) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.origin !== source;
  } catch { return false; }
}

async function copyPublicImage(value, name) {
  if (!value) return "";
  if (isExternalImage(value)) return value;
  const match = /^\/api\/resource-media\/([a-f0-9-]{36})$/i.exec(value);
  if (!match) throw new Error(`Refusing non-public or unexpected media URL: ${value}`);
  const response = await fetchPublic(`${source}${value}`);
  if (!response.ok) throw new Error(`Public image fetch failed (${response.status}): ${value}`);
  const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const extension = allowedImageTypes.get(mime);
  if (!extension) throw new Error(`Public media is not an allowed image type: ${mime || "missing content type"}`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > 20 * 1024 * 1024) throw new Error(`Image exceeds 20 MiB limit: ${value}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 20 * 1024 * 1024) throw new Error(`Image exceeds 20 MiB limit: ${value}`);
  const fingerprint = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const file = `${name}-${fingerprint}.${extension}`;
  await mkdir(path.join(root, "public", "media"), { recursive: true });
  await writeFile(path.join(root, "public", "media", file), bytes);
  return `/media/${file}`;
}

async function snapshot() {
  const publishId = getPublishId();
  const response = await fetchPublic(`${source}/api/site-catalog`);
  if (!response.ok) throw new Error(`Approved public catalog fetch failed (${response.status}).`);
  const body = await response.json();
  if (!Array.isArray(body.items) || !/^[a-f0-9]{64}$/i.test(body.publicRevision || "")) {
    throw new Error("The approved public catalog must return an items array and SHA-256 publicRevision.");
  }

  const items = [];
  const activeIds = new Set();
  const activeMedia = new Set();
  for (const row of body.items) {
    const id = safeId(row.id);
    if (activeIds.has(id)) throw new Error(`Duplicate published resource id: ${id}`);
    activeIds.add(id);
    const coverUrl = await copyPublicImage(row.coverUrl, `${id}-cover`);
    if (coverUrl.startsWith("/media/")) activeMedia.add(coverUrl);
    const screenshots = [];
    for (let index = 0; index < (Array.isArray(row.screenshots) ? row.screenshots.length : 0); index++) {
      const shot = row.screenshots[index];
      const url = await copyPublicImage(shot?.url, `${id}-shot-${index + 1}`);
      if (url.startsWith("/media/")) activeMedia.add(url);
      screenshots.push({ url, caption: typeof shot?.caption === "string" ? shot.caption : "" });
    }
    items.push(toPublicResource(row, { coverUrl, screenshots }));
  }

  await pruneGeneratedArtifacts(root, activeIds, activeMedia);
  const publishedAt = new Date().toISOString();
  const manifest = { snapshotAt: publishedAt, items };
  const manifestBytes = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestPath = path.join(root, "src", "data", "resources.json");
  await writeFile(manifestPath, manifestBytes, "utf8");
  const publication = {
    publishId,
    publishedAt,
    publicRevision: body.publicRevision.toLowerCase(),
  };
  await writeFile(path.join(root, "public", "publication.json"), `${JSON.stringify(publication, null, 2)}\n`, "utf8");
  console.log(`Saved ${items.length} explicitly approved public resource(s); publish=${publishId}; revision=${publication.publicRevision}`);

  const written = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const item of written.items) {
    if (Object.keys(item).some(key => !allowedFields.has(key))) throw new Error(`Unexpected manifest field in ${item.id}.`);
    if ([item.coverUrl, ...item.screenshots.map(shot => shot.url)].some(url => url && !url.startsWith("/media/") && !isExternalImage(url))) {
      throw new Error(`Manifest still references API media in ${item.id}.`);
    }
  }
  const publicationBytes = JSON.parse(await readFile(path.join(root, "public", "publication.json"), "utf8"));
  if (Object.keys(publicationBytes).sort().join(",") !== "publicRevision,publishId,publishedAt") throw new Error("Publication marker contains unexpected fields.");
  for (const url of activeMedia) await stat(path.join(root, "public", url.slice(1)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await snapshot();
