import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const sourceRoot = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-generate-pages-"));
const marker = "<!-- generated public resource route; keep this file data-free -->";
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
try {
  await mkdir(path.join(temp, "scripts"), { recursive: true });
  await mkdir(path.join(temp, "src/data"), { recursive: true });
  await mkdir(path.join(temp, "resources", id), { recursive: true });
  await cp(path.join(sourceRoot, "scripts/generate-pages.mjs"), path.join(temp, "scripts/generate-pages.mjs"));
  await writeFile(path.join(temp, "src/data/resources.json"), JSON.stringify({ items: [{ id }] }));
  const template = path.join(temp, "resources/index.html");
  const route = path.join(temp, "resources", id, "index.html");
  await writeFile(template, "<main>template one</main>");
  await writeFile(route, `${marker}\n<main>stale route</main>`);

  const run = () => spawnSync(process.execPath, [path.join(temp, "scripts/generate-pages.mjs")], { encoding: "utf8" });
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  const firstOutput = await readFile(route, "utf8");
  await writeFile(template, "<main>template two</main>");
  const second = run();
  assert.equal(second.status, 0, second.stderr);
  const secondOutput = await readFile(route, "utf8");
  assert.match(secondOutput, /template two/, "A repeated run must refresh generated routes from the current template.");
  const third = run();
  assert.equal(third.status, 0, third.stderr);
  assert.equal(await readFile(route, "utf8"), secondOutput, "Repeated output must be deterministic.");
  assert.notEqual(firstOutput, secondOutput);
  assert.deepEqual((await readdir(path.join(temp, "resources", id))).sort(), ["index.html"]);

  const authoredId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const authoredDir = path.join(temp, "resources", authoredId);
  await mkdir(authoredDir, { recursive: true });
  const authoredRoute = path.join(authoredDir, "index.html");
  await writeFile(authoredRoute, "hand-authored page");
  await writeFile(path.join(temp, "src/data/resources.json"), JSON.stringify({ items: [{ id }, { id: authoredId }] }));
  const protectedRun = run();
  assert.notEqual(protectedRun.status, 0, "Hand-authored routes must not be overwritten.");
  assert.equal(await readFile(authoredRoute, "utf8"), "hand-authored page");
  assert.ok(protectedRun.stderr.includes("Refusing to replace a non-generated route"));
  console.log(JSON.stringify({ templateRefresh: true, deterministicRepeat: true, authoredRouteProtected: true, staleRouteRefreshed: secondOutput.includes("template two") }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
