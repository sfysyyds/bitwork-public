import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const sourceRoot = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-snapshot-entry-"));
try {
  const script = path.join(temp, "scripts/snapshot-public-resources.mjs");
  const alias = path.join(temp, "shortcut/snapshot-public-resources.mjs");
  await mkdir(path.dirname(script), { recursive: true });
  await mkdir(path.dirname(alias), { recursive: true });
  await mkdir(path.join(temp, "src/data"), { recursive: true });
  await mkdir(path.join(temp, "resources"), { recursive: true });
  await mkdir(path.join(temp, "public/media"), { recursive: true });
  await copyFile(path.join(sourceRoot, "scripts/snapshot-public-resources.mjs"), script);
  await symlink(script, alias);
  await writeFile(path.join(temp, "src/data/resources.json"), JSON.stringify({ items: [] }));
  await writeFile(path.join(temp, "resources/index.html"), "catalog");
  const code = `import {pathToFileURL} from 'node:url';process.argv[1]=${JSON.stringify(alias)};globalThis.fetch=async()=>Response.json({items:[],publicRevision:'a'.repeat(64)});await import(pathToFileURL(process.argv[1]).href);`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8", env: { ...process.env, PUBLISH_ID: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } });
  assert.equal(result.status, 0, result.stderr);
  const publication = JSON.parse(await readFile(path.join(temp, "public/publication.json"), "utf8"));
  assert.equal(publication.publishId, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  console.log(JSON.stringify({ symlinkCliExecuted: true, publicationWritten: true, output: result.stdout.trim().split(/\r?\n/).at(-1) }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
