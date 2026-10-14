import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawHost = process.env.VITE_WORKBENCH_HOST?.trim();
if (!rawHost || rawHost === "HOST") throw new Error("Publish blocked: set VITE_WORKBENCH_HOST to the confirmed HTTPS backend origin.");
let host;
try { host = new URL(rawHost); } catch { throw new Error("Publish blocked: VITE_WORKBENCH_HOST must be a valid HTTPS origin."); }
if (host.protocol !== "https:" || host.origin !== rawHost.replace(/\/$/, "") || host.pathname !== "/" || host.search || host.hash) {
  throw new Error("Publish blocked: VITE_WORKBENCH_HOST must be only an HTTPS origin (no path, query, or fragment).");
}
const base = process.env.PAGES_BASE_PATH || "/bitwork-public/";
if (!base.startsWith("/") || !base.endsWith("/")) throw new Error("Publish blocked: PAGES_BASE_PATH must start and end with '/'.");

const manifest = JSON.parse(await readFile(path.join(root, "src", "data", "resources.json"), "utf8"));
if (!manifest.snapshotAt || manifest.snapshotAt === "pending" || !Array.isArray(manifest.items)) throw new Error("Publish blocked: refresh the explicit public resources snapshot first.");
const allowed = new Set(["id", "title", "english", "genre", "version", "intro", "downloadUrl", "coverUrl", "screenshots", "description", "installation", "changelog", "credits"]);
for (const item of manifest.items) {
  if (Object.keys(item).some(key => !allowed.has(key))) throw new Error(`Publish blocked: non-public field detected in ${item.id}.`);
  const urls = [item.coverUrl, ...(item.screenshots || []).map(shot => shot.url)].filter(Boolean);
  for (const url of urls) {
    if (!url.startsWith("/media/") || url.includes("..") || url.includes("/api/")) throw new Error(`Publish blocked: non-static media URL in ${item.id}.`);
    await stat(path.join(root, "public", url.slice(1)));
  }
  if (item.downloadUrl && new URL(item.downloadUrl).protocol !== "https:") throw new Error(`Publish blocked: non-HTTPS download URL in ${item.id}.`);
}
console.log(`Publish preflight passed: host=${host.origin}, base=${base}, public resources=${manifest.items.length}.`);
