import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPublic, isDirectInvocation, pruneGeneratedArtifacts, readBoundedBytes, toPublicResource, validateCatalog } from "./snapshot-public-resources.mjs";

const marker = "<!-- generated public resource route; keep this file data-free -->";
const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-public-snapshot-"));
try {
  assert.deepEqual(await readBoundedBytes(new Response(new Uint8Array([1, 2, 3])), 3, "fixture"), Buffer.from([1, 2, 3]));
  let oversizedCancelled = false, oversizedPulls = 0;
  const oversized = new Response(new ReadableStream({
    pull(controller) { oversizedPulls++; controller.enqueue(new Uint8Array(1024)); },
    cancel() { oversizedCancelled = true; },
  }));
  await assert.rejects(readBoundedBytes(oversized, 100, "fixture"), /exceeds 100 byte limit/);
  assert.equal(oversizedCancelled, true);
  assert.equal(oversizedPulls, 1, "Bounded reader must stop at the first over-limit chunk.");

  const catalog = { publicRevision: "a".repeat(64), items: [{ id: "a", screenshots: [] }] };
  assert.equal(validateCatalog(catalog), catalog);
  assert.throws(() => validateCatalog({ ...catalog, items: Array.from({ length: 501 }, () => ({})) }), /exceeds 500 resource limit/);
  assert.throws(() => validateCatalog({ ...catalog, items: [{ screenshots: Array(101).fill({}) }] }), /exceeds 100 screenshots/);
  assert.throws(() => validateCatalog({ ...catalog, items: [{ description: "x".repeat(100_001) }] }), /field description exceeds 100000 characters/);
  assert.throws(() => validateCatalog({ ...catalog, items: [{ screenshots: [{ caption: "x".repeat(2_001) }] }] }), /caption exceeds 2000 characters/);

  const snapshotScript = fileURLToPath(new URL("./snapshot-public-resources.mjs", import.meta.url));
  assert.equal(await isDirectInvocation(snapshotScript, snapshotScript), true);
  assert.equal(await isDirectInvocation(undefined, snapshotScript), false);
  let symlinkCheck = "passed";
  try {
    const alias = path.join(temp, "snapshot-alias.mjs");
    await symlink(snapshotScript, alias);
    assert.equal(await isDirectInvocation(alias, snapshotScript), true);
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOSYS"].includes(error.code)) throw error;
    symlinkCheck = `skipped:${error.code}`;
  }

  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (_url, { signal }) => new Promise((_, reject) => {
    const keepAlive = setTimeout(() => {}, 100);
    const abort = () => { clearTimeout(keepAlive); reject(signal.reason); };
    if (signal.aborted) abort(); else signal.addEventListener("abort", abort, { once: true });
  });
  try {
    await assert.rejects(fetchPublic("https://timeout.example/", 5), error => error.name === "TimeoutError");
  } finally {
    globalThis.fetch = nativeFetch;
  }

  const resources = path.join(temp, "resources");
  const media = path.join(temp, "public", "media");
  const staleRoute = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const currentRoute = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await mkdir(path.join(resources, staleRoute), { recursive: true });
  await mkdir(path.join(resources, currentRoute), { recursive: true });
  await mkdir(media, { recursive: true });
  await writeFile(path.join(resources, staleRoute, "index.html"), `${marker}\nold`);
  await writeFile(path.join(resources, currentRoute, "index.html"), `${marker}\ncurrent`);
  const staleImage = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa-cover.png";
  const currentImage = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb-cover.png";
  const customImage = "custom-cover.png";
  const staleFingerprint = staleRoute + "-cover-1111111111111111.png", currentFingerprint = currentRoute + "-cover-2222222222222222.png";
  for (const name of [staleImage, currentImage, customImage, staleFingerprint, currentFingerprint]) await writeFile(path.join(media, name), "image");

  await pruneGeneratedArtifacts(temp, new Set([currentRoute]), new Set([`/media/${currentImage}`, `/media/${currentFingerprint}`]));
  await assert.rejects(readFile(path.join(resources, staleRoute, "index.html")));
  assert.match(await readFile(path.join(resources, currentRoute, "index.html"), "utf8"), /current/);
  await assert.rejects(readFile(path.join(media, staleImage)));
  await assert.rejects(readFile(path.join(media, staleFingerprint)));
  assert.equal(await readFile(path.join(media, currentFingerprint), "utf8"), "image");
  assert.equal(await readFile(path.join(media, currentImage), "utf8"), "image");
  assert.equal(await readFile(path.join(media, customImage), "utf8"), "image");

  const projected = toPublicResource({
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    title: "Public title",
    downloadUrl: "https://github.com/example/release.zip",
    gameUrl: "https://game.example.test/",
    articleUrl: "https://www.bilibili.com/opus/123",
    site_public: 1,
    token: "must-not-leak",
    privateNote: "must-not-leak",
  }, {
    coverUrl: "/media/cover.png",
    screenshots: [{ url: "/media/shot.png", caption: "Public caption", privateNote: "must-not-leak" }],
  });
  assert.deepEqual(Object.keys(projected), [
    "id", "title", "english", "genre", "version", "intro", "downloadUrl", "gameUrl", "articleUrl", "coverUrl", "screenshots",
    "description", "installation", "changelog", "credits",
  ]);
  assert.equal(projected.articleUrl,"https://www.bilibili.com/opus/123");
  assert.equal(projected.gameUrl,"https://game.example.test/");
  assert.throws(() => toPublicResource({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", gameUrl: "https://fixture-user:fixture-pass@example.invalid/" }));
  assert.throws(() => toPublicResource({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", gameUrl: "http://game.example.test/" }));
  assert.throws(() => toPublicResource({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", articleUrl: "javascript:alert(1)" }));
  assert.deepEqual(projected.screenshots, [{ url: "/media/shot.png", caption: "Public caption" }]);
  assert.equal(JSON.stringify(projected).includes("must-not-leak"), false);
  assert.throws(() => toPublicResource({ id: "not-an-id", downloadUrl: "https://github.com/x" }));
  assert.throws(() => toPublicResource({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", downloadUrl: "http://example.com" }));

  const unsafe = path.join(temp, "unsafe");
  const oldRoute = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  await mkdir(path.join(unsafe, "resources", oldRoute), { recursive: true });
  await mkdir(path.join(unsafe, "public", "media"), { recursive: true });
  await writeFile(path.join(unsafe, "resources", oldRoute, "index.html"), "hand-authored route");
  await assert.rejects(pruneGeneratedArtifacts(unsafe, new Set(), new Set()), /unrecognized stale route/);
  assert.equal(await readdir(path.join(unsafe, "resources", oldRoute)).then(items => items.length), 1);

  console.log(JSON.stringify({ snapshotBounds: "PASS", overLimitStreamCancelled: oversizedCancelled, streamedChunksRead: oversizedPulls, catalogLimits: true, timeout: true, realpathEntry: true, symlinkEntry: symlinkCheck }));
  console.log("Public snapshot checks passed: stale generated routes/media removed; current/custom assets preserved; private fields excluded; unsafe stale route blocks publish.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
