import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pruneGeneratedArtifacts, toPublicResource } from "./snapshot-public-resources.mjs";

const marker = "<!-- generated public resource route; keep this file data-free -->";
const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-public-snapshot-"));
try {
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
    articleUrl: "https://www.bilibili.com/opus/123",
    site_public: 1,
    token: "must-not-leak",
    privateNote: "must-not-leak",
  }, {
    coverUrl: "/media/cover.png",
    screenshots: [{ url: "/media/shot.png", caption: "Public caption", privateNote: "must-not-leak" }],
  });
  assert.deepEqual(Object.keys(projected), [
    "id", "title", "english", "genre", "version", "intro", "downloadUrl", "articleUrl", "coverUrl", "screenshots",
    "description", "installation", "changelog", "credits",
  ]);
  assert.equal(projected.articleUrl,"https://www.bilibili.com/opus/123");
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

  console.log("Public snapshot checks passed: stale generated routes/media removed; current/custom assets preserved; private fields excluded; unsafe stale route blocks publish.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
