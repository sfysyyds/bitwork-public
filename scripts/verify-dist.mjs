import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const manifest = JSON.parse(await readFile(path.join(root, "src", "data", "resources.json"), "utf8"));
const publication = JSON.parse(await readFile(path.join(root, "public", "publication.json"), "utf8"));
if (Object.keys(publication).sort().join(",") !== "publicRevision,publishId,publishedAt" || !publication.publishId || !Number.isFinite(Date.parse(publication.publishedAt)) || !/^[a-f0-9]{64}$/i.test(publication.publicRevision || "")) throw new Error("Static output must include a verifiable publication marker with only public fields.");
const allowed = /^(?:CNAME|index\.html|favicon\.svg|publication\.json|resources\/(?:index\.html|[a-f0-9-]+\/index\.html)|assets\/(?:[A-Za-z0-9._-]+|community\/(?:join|sponsor)\.(?:svg|png))|fonts\/HarmonyOS-Sans-LICENSE\.txt|media\/[a-f0-9-]+-(?:cover|shot-\d+)(?:-[a-f0-9]{16})?\.(?:jpg|png|webp|gif|avif))$/i;
const files = [];
async function walk(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) await walk(path.join(directory, entry.name), relative);
    else if (entry.isFile()) files.push(relative);
  }
}
await walk(dist);
if (!files.length || files.some(file => !allowed.test(file))) throw new Error("Static output contains an unexpected file or directory.");
if ((await readFile(path.join(dist, "CNAME"), "utf8")).trim() !== "bitwork.top") throw new Error("Static output must publish only the approved bitwork.top custom domain.");
if (files.some(file => file.toLowerCase().endsWith(".rpy"))) throw new Error("Static output must never contain Ren'Py source files.");
const published = new Set(manifest.items.flatMap(item => [
  `resources/${item.id}/index.html`,
  ...[item.coverUrl, ...(item.screenshots || []).map(shot => shot.url)].filter(Boolean).map(url => url.replace(/^\//, "")),
]));
if (files.some(file => /^(?:media\/|resources\/[^/]+\/)/.test(file) && !published.has(file))) throw new Error("Static output contains an unpublished resource route or media file.");
for (const item of manifest.items) {
  const route = `resources/${item.id}/index.html`;
  if (!files.includes(route)) throw new Error(`Missing direct static detail route: ${route}`);
}
for (const file of files.filter(file => /\.(?:html|js|css|svg|txt|json)$/i.test(file))) {
  const content = await readFile(path.join(dist, file), "utf8");
  if (/\/api\/(?:resources|resource-media)/i.test(content)) throw new Error(`Static output still references the live API: ${file}`);
  if (/(?:^|[=:])HOST(?:$|[\s"'`])/m.test(content)) throw new Error(`Unconfigured HOST placeholder found in output: ${file}`);
}
const totalBytes = (await Promise.all(files.map(file => stat(path.join(dist, file))))).reduce((sum, file) => sum + file.size, 0);
console.log(`Static output verified: ${files.length} files, ${totalBytes} bytes, ${manifest.items.length} direct resource route(s), no backend API or private source.`);
