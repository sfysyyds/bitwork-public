import assert from "node:assert/strict";
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-image-cache-"));
try {
  const script = path.join(temp, "scripts", "snapshot-public-resources.mjs");
  await mkdir(path.dirname(script), { recursive: true });
  await mkdir(path.join(temp, "src/data"), { recursive: true });
  await mkdir(path.join(temp, "resources"), { recursive: true });
  await mkdir(path.join(temp, "public/media"), { recursive: true });
  await writeFile(path.join(temp, "src/data/resources.json"), JSON.stringify({ items: [] }));
  await writeFile(path.join(temp, "resources/index.html"), "<html></html>");
  await writeFile(path.join(temp, "public/.keep"), "");
  await writeFile(path.join(temp, "public/publication.json"), "{}");
  await writeFile(path.join(temp, "public/media/.keep"), "");
  await copyFile(path.join(root, "scripts/snapshot-public-resources.mjs"), script);

  const input = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", title: "Content-addressed media", coverUrl: "/api/resource-media/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", screenshots: [] };
  async function run(version) {
    const code = `let mediaRequests=0;const item=${JSON.stringify(input)};globalThis.fetch=async url=>String(url).includes('/api/site-catalog')?Response.json({items:[item],publicRevision:'a'.repeat(64)}):(mediaRequests++,new Response(new Uint8Array([137,80,78,71,${version}]),{headers:{'Content-Type':'image/png'}}));process.argv[1]=${JSON.stringify(script)};await import(${JSON.stringify(pathToFileURL(script).href)});console.log(JSON.stringify({mediaRequests}));`;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", env: { ...process.env, PUBLISH_ID: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } });
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(await readFile(path.join(temp, "src/data/resources.json"), "utf8"));
    const output = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
    return { url: data.items[0].coverUrl, mediaRequests: output.mediaRequests };
  }

  const first = await run(1), same = await run(1), changed = await run(2);
  assert.equal(first.url, same.url, "Identical media bytes must produce the same content-addressed path.");
  assert.notEqual(first.url, changed.url, "Changed media bytes must change the content-addressed path.");
  assert.deepEqual([first.mediaRequests, same.mediaRequests, changed.mediaRequests], [1, 1, 1], "Snapshots still fetch each source; no skip-fetch cache was added.");
  const files = await readdir(path.join(temp, "public/media"));
  assert.equal(files.filter(name => name !== ".keep").length, 1, "Only active fingerprinted media remains after replacement.");
  console.log(JSON.stringify({ contentAddressedNames: true, fetchesPerSnapshot: [first.mediaRequests, same.mediaRequests, changed.mediaRequests], skippedFetchCache: false, staleMediaPruned: true }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
