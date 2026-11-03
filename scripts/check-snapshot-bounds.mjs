import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-snapshot-bounds-"));
const runner = `import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';let bytesRead=0,cancelled=false;const script=process.env.SNAPSHOT_SCRIPT,scenario=process.env.SNAPSHOT_SCENARIO;function stream(total,source){let offset=0;return new ReadableStream({pull(controller){if(offset>=total){controller.close();return}const size=Math.min(32768,total-offset),chunk=source?source.subarray(offset,offset+size):new Uint8Array(size);offset+=size;bytesRead+=size;controller.enqueue(chunk)},cancel(){cancelled=true}})}globalThis.fetch=async url=>{if(String(url).includes('/api/site-catalog')){if(scenario==='catalog'){const bytes=await readFile(process.env.CATALOG_FILE);return new Response(stream(bytes.length,bytes))}return Response.json({items:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',coverUrl:'/api/resource-media/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',screenshots:[]}],publicRevision:'a'.repeat(64)})}return new Response(stream(32*1024*1024),{headers:{'content-type':'image/png'}})};process.argv[1]=script;try{await import(pathToFileURL(script).href);console.log(JSON.stringify({status:'ok',bytesRead,cancelled}))}catch(error){console.log(JSON.stringify({status:'error',message:error.message,bytesRead,cancelled}))}`;
try {
  async function run(name, catalog) {
    const workspace = path.join(temp, name);
    const script = path.join(workspace, "scripts/snapshot-public-resources.mjs");
    await mkdir(path.dirname(script), { recursive: true });
    await mkdir(path.join(workspace, "src/data"), { recursive: true });
    await mkdir(path.join(workspace, "resources"), { recursive: true });
    await mkdir(path.join(workspace, "public/media"), { recursive: true });
    await copyFile(path.join(sourceRoot, "scripts/snapshot-public-resources.mjs"), script);
    await writeFile(path.join(workspace, "resources/index.html"), "catalog");
    await writeFile(path.join(workspace, "src/data/resources.json"), JSON.stringify({ items: [] }));
    const catalogFile = path.join(workspace, "large-catalog.json");
    if (catalog) await writeFile(catalogFile, JSON.stringify({ items: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", description: "x".repeat(8 * 1024 * 1024) }], publicRevision: "a".repeat(64) }));
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", runner], {
      encoding: "utf8",
      env: { ...process.env, SNAPSHOT_SCRIPT: script, SNAPSHOT_SCENARIO: catalog ? "catalog" : "image", CATALOG_FILE: catalogFile, PUBLISH_ID: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
    });
    assert.equal(child.status, 0, child.stderr);
    return JSON.parse(child.stdout.trim().split(/\r?\n/).at(-1));
  }

  const oversizedCatalog = await run("catalog", true);
  const oversizedImage = await run("image", false);
  console.log(JSON.stringify({ oversizedCatalog, oversizedImage }));
  assert.equal(oversizedCatalog.status, "error", "Oversized catalog must be rejected.");
  assert.equal(oversizedCatalog.cancelled, true, "Oversized catalog stream must be cancelled.");
  assert.ok(oversizedCatalog.bytesRead <= 5 * 1024 * 1024 + 2 * 32768, "Catalog reads must stop at the byte budget plus bounded stream buffering.");
  assert.equal(oversizedImage.status, "error", "Oversized media must be rejected.");
  assert.equal(oversizedImage.cancelled, true, "Oversized media stream must be cancelled.");
  assert.ok(oversizedImage.bytesRead <= 20 * 1024 * 1024 + 2 * 32768, "Media reads must stop at the byte budget plus bounded stream buffering.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
