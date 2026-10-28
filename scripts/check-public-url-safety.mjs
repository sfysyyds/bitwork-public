import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const baselineAt = process.argv.indexOf("--baseline");
const baselineRoot = baselineAt < 0 ? "" : path.resolve(process.argv[baselineAt + 1]);
const moduleAt = pathToFileURL(path.join(root, "scripts/snapshot-public-resources.mjs")).href;
const { toPublicResource } = await import(moduleAt);
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const unsafeDownload = "https://fixture-user:fixture-pass@example.invalid/patch.zip";
const safeDownload = "https://github.com/example/game/releases/download/v1/patch.zip";

assert.equal(toPublicResource({ id, downloadUrl: safeDownload }).downloadUrl, safeDownload);
assert.throws(() => toPublicResource({ id, downloadUrl: unsafeDownload }), /unsafe public download link/);
assert.throws(() => toPublicResource({ id, gameUrl: "http://game.example.test/" }), /Invalid public game URL/);
assert.throws(() => toPublicResource({ id, gameUrl: "https://fixture-user:fixture-pass@example.invalid/" }), /Invalid public game URL/);
assert.throws(() => toPublicResource({ id, articleUrl: "https://fixture-user:fixture-pass@example.invalid/post" }), /Invalid public article link/);

async function checkPreflight(sourceRoot, overrides = {}) {
  const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-public-url-safety-"));
  try {
    await mkdir(path.join(temp, "scripts"), { recursive: true });
    await mkdir(path.join(temp, "src/data"), { recursive: true });
    await mkdir(path.join(temp, "public"), { recursive: true });
    await cp(path.join(sourceRoot, "scripts/preflight.mjs"), path.join(temp, "scripts/preflight.mjs"));
    await cp(path.join(sourceRoot, "scripts/snapshot-public-resources.mjs"), path.join(temp, "scripts/snapshot-public-resources.mjs"));
    const item = { id, downloadUrl: safeDownload, articleUrl: "https://www.bilibili.com/opus/123", coverUrl: "", screenshots: [], ...overrides };
    await writeFile(path.join(temp, "src/data/resources.json"), JSON.stringify({ snapshotAt: "2026-10-16T00:00:00.000Z", items: [item] }));
    await writeFile(path.join(temp, "public/publication.json"), JSON.stringify({ publishId: id, publishedAt: "2026-10-16T00:00:00.000Z", publicRevision: "a".repeat(64) }));
    return spawnSync(process.execPath, [path.join(temp, "scripts/preflight.mjs")], {
      encoding: "utf8",
      env: { ...process.env, VITE_WORKBENCH_HOST: "https://work.bitwork.top", PAGES_BASE_PATH: "/" },
    });
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

const clean = await checkPreflight(root);
const validGame = await checkPreflight(root, { gameUrl: "https://game.example.test/" });
const credentialedDownload = await checkPreflight(root, { downloadUrl: unsafeDownload });
const credentialedArticle = await checkPreflight(root, { articleUrl: "https://fixture-user:fixture-pass@example.invalid/post" });
const credentialedGame = await checkPreflight(root, { gameUrl: "https://fixture-user:fixture-pass@example.invalid/" });
const externalImage = await checkPreflight(root, { coverUrl: "https://images.example.invalid/cover.png" });
const traversalImage = await checkPreflight(root, { coverUrl: "/media/../resources/index.html" });
assert.equal(clean.status, 0, clean.stderr);
assert.equal(validGame.status, 0, validGame.stderr);
assert.equal(credentialedDownload.status, 1, credentialedDownload.stdout);
assert.match(credentialedDownload.stderr, /unsafe download URL/);
assert.equal(credentialedArticle.status, 1);
assert.match(credentialedArticle.stderr, /unsafe article URL/);
assert.equal(credentialedGame.status, 1);
assert.match(credentialedGame.stderr, /unsafe game URL/);
assert.equal(externalImage.status, 0, externalImage.stderr);
assert.equal(traversalImage.status, 1);
assert.match(traversalImage.stderr, /non-static media URL/);

let baseline;
if (baselineRoot) {
  const oldModule = await import(`${pathToFileURL(path.join(baselineRoot, "scripts/snapshot-public-resources.mjs")).href}?baseline=1`);
  baseline = {
    mapperOutput: oldModule.toPublicResource({ id, downloadUrl: unsafeDownload }).downloadUrl,
    preflight: await checkPreflight(baselineRoot, { downloadUrl: unsafeDownload }),
  };
  assert.equal(baseline.mapperOutput, unsafeDownload);
  assert.equal(baseline.preflight.status, 0, baseline.preflight.stderr);
}

console.log(JSON.stringify({
  behavior: "MODIFIED",
  baseline: baseline && {
    mapperOutput: "credential-bearing HTTPS URL passed through",
    preflightStdout: baseline.preflight.stdout.trim(),
    preflightStderr: baseline.preflight.stderr.trim(),
    preflightExit: baseline.preflight.status,
  },
  modified: {
    mapperOutput: "rejected credential-bearing HTTPS URL",
    preflightStdout: credentialedDownload.stdout.trim(),
    preflightStderr: credentialedDownload.stderr.trim(),
    preflightExit: credentialedDownload.status,
  },
  cleanHttpsExit: clean.status,
  validGameExit: validGame.status,
  credentialedArticleExit: credentialedArticle.status,
  credentialedGameExit: credentialedGame.status,
  externalImageExit: externalImage.status,
  traversalImageExit: traversalImage.status,
}));
