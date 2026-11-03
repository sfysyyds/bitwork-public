import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(root, "src", "data", "resources.json"), "utf8"));
if (!Array.isArray(manifest.items)) throw new Error("src/data/resources.json must contain an items array.");
const route = await readFile(path.join(root, "resources", "index.html"), "utf8");
const marker = "<!-- generated public resource route; keep this file data-free -->";
const seen = new Set();
for (const item of manifest.items) {
  if (typeof item.id !== "string" || !/^[a-f0-9-]{1,80}$/i.test(item.id) || seen.has(item.id)) throw new Error("Resource IDs must be unique safe route segments.");
  seen.add(item.id);
  const directory = path.join(root, "resources", item.id);
  const file = path.join(directory, "index.html");
  await mkdir(directory, { recursive: true });
  let existing;
  try {
    existing = await readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (existing !== undefined && !existing.includes(marker)) throw new Error(`Refusing to replace a non-generated route: ${file}`);
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${marker}\n${route}`, "utf8");
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}
console.log(`Prepared ${seen.size} static detail route(s).`);
