import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, copyFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || ".");
const fixed = process.argv.includes("--expect-fixed");
let redirectsFollowed = 0;
const server = createServer((req, res) => {
  if (req.url === "/catalog") { res.writeHead(301, { Location: "/unexpected" }); res.end(); }
  else { redirectsFollowed++; res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ items: [], publicRevision: "a".repeat(64) })); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-redirect-"));
try {
  for (const dir of ["scripts", "resources", "src/data", "public"]) await mkdir(path.join(temp, dir), { recursive: true });
  const script = path.join(temp, "scripts/snapshot-public-resources.mjs");
  await copyFile(path.join(root, "scripts/snapshot-public-resources.mjs"), script);
  const url = `http://127.0.0.1:${server.address().port}/catalog`;
  const code = `const fetchOriginal=globalThis.fetch;globalThis.fetch=(_url, options)=>fetchOriginal(${JSON.stringify(url)}, options);process.argv[1]=${JSON.stringify(script)};await import(${JSON.stringify(pathToFileURL(script).href)});`;
  const child = spawn(process.execPath, ["--input-type=module", "-e", code], { env: { ...process.env, PUBLISH_ID: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } });
  let stdout = "", stderr = "";
  child.stdout.on("data", data => stdout += data); child.stderr.on("data", data => stderr += data);
  const exit = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
  assert.equal(exit, fixed ? 1 : 0, stderr);
  assert.equal(redirectsFollowed, fixed ? 0 : 1);
  console.log(JSON.stringify({ mode: fixed ? "MODIFIED" : "BASELINE_OR_ROLLBACK", exit, redirectsFollowed, stdout, stderr }));
} finally { server.close(); await rm(temp, { recursive: true, force: true }); }
