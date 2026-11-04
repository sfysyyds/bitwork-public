import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergePreviousVersionedAssets, snapshotVersionedAssets } from "./preserve-versioned-assets.mjs";

const temp = await mkdtemp(path.join(os.tmpdir(), "bitwork-versioned-assets-"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const names = async directory => (await readdir(directory)).sort();
const isVersionedAsset = name => /^.+-[A-Za-z0-9_-]{8}\.(?:m?js|css|woff2?|ttf|otf|eot)$/i.test(name);
const write = async (directory, name, contents) => {
  const file = path.join(directory, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, contents);
};

try {
  const assetsByGeneration = [
    ["main-D3VunjV6.js", "Home-47i9XQ9H.js", "style-CXM0oRMP.css", "HarmonyOS_Sans_Bold-7KndVL3J.ttf"],
    ["main-Z9_2yy6A.js", "Home-q9Rf_7xB.js", "style-mN7xqX2-.css", "HarmonyOS_Sans_Bold-J9KfS1q_.ttf"],
    ["main-Ac07yWJq.js", "Home-YY7_1uJv.js", "style-Vn1xK0cA.css", "HarmonyOS_Sans_Bold-sD0P5f-z.ttf"],
    ["main-cB80fH9q.js", "Home-k0_JdaQ7.js", "style-ATz8N3p_.css", "HarmonyOS_Sans_Bold-fR4w8y5X.ttf"]
  ];
  const asset = generation => assetsByGeneration[generation - 1];
  let previous = path.join(temp, "missing-cache");
  const counts = [];

  for (let generation = 1; generation <= 4; generation++) {
    const dist = path.join(temp, `dist-${generation}`);
    const assets = path.join(dist, "assets");
    const current = path.join(temp, `current-${generation}`);
    for (const name of asset(generation)) await write(assets, name, `generation-${generation}:${name}`);
    await write(assets, "unhashed.js", "not-versioned");
    await write(assets, "image-deadbeef.png", "image");
    await write(dist, "index.html", "old-html-is-not-an-asset");
    await write(dist, "media/withdrawn.jpg", "withdrawn-media");
    await write(dist, "resources/catalog.json", "business-data");

    const snapshot = await snapshotVersionedAssets(assets, current);
    assert.deepEqual(snapshot.names, asset(generation).sort(), "only hashed JS/CSS/font files enter the cache snapshot");
    if (generation === 1) {
      const miss = await mergePreviousVersionedAssets(assets, previous);
      assert.equal(miss.restored, 0, "a first-run cache miss is a normal no-op");
    } else {
      const merged = await mergePreviousVersionedAssets(assets, previous);
      assert.equal(merged.restored, 4, "exactly the previous generation is restored");
    }

    const expected = generation === 1 ? asset(generation).sort() : [...asset(generation), ...asset(generation - 1)].sort();
    assert.deepEqual((await names(assets)).filter(isVersionedAsset).sort(), expected,
      "published assets contain only current and previous hashed browser assets");
    assert.equal(await readFile(path.join(dist, "index.html"), "utf8"), "old-html-is-not-an-asset");
    assert.equal(await readFile(path.join(dist, "media/withdrawn.jpg"), "utf8"), "withdrawn-media");
    assert.deepEqual(await names(current), asset(generation).sort(), "the next cache snapshot does not include retained old assets");
    counts.push(expected.length);

    const nextPrevious = path.join(temp, `previous-${generation}`);
    await mkdir(nextPrevious, { recursive: true });
    for (const name of await names(current)) await copyFile(path.join(current, name), path.join(nextPrevious, name));
    previous = nextPrevious;
  }

  const collisionAssets = path.join(temp, "collision-dist", "assets");
  const collisionPrevious = path.join(temp, "collision-previous");
  await write(collisionAssets, "shared-deadbeef.js", "new-current-bytes");
  await write(collisionPrevious, "shared-deadbeef.js", "stale-cached-bytes");
  await write(collisionPrevious, "old-image-deadbeef.png", "old-image");
  await write(collisionPrevious, "index.html", "old-html");
  await write(collisionPrevious, "catalog.json", "business-data");
  await mkdir(path.join(collisionPrevious, "business"), { recursive: true });
  await write(path.join(collisionPrevious, "business"), "catalog.json", "nested-business-data");
  const collision = await mergePreviousVersionedAssets(collisionAssets, collisionPrevious);
  assert.equal(collision.restored, 0);
  assert.equal(collision.alreadyCurrent, 1, "a cached name never overwrites a current build file");
  assert.equal(await readFile(path.join(collisionAssets, "shared-deadbeef.js"), "utf8"), "new-current-bytes");
  assert.deepEqual(await names(collisionAssets), ["shared-deadbeef.js"], "old images, HTML, and business directories are not restored");

  const workflow = (await readFile(path.join(root, ".github/workflows/public-site.yml"), "utf8")).replace(/\r\n/g, "\n");
  const assetWorkflow = workflow.slice(workflow.indexOf("      - name: Restore previous deployed browser assets"));
  const restorePath = assetWorkflow.match(/uses: actions\/cache\/restore@v4\n\s+with:\n\s+path: ([^\n]+)/)?.[1].trim();
  const savePath = assetWorkflow.match(/uses: actions\/cache\/save@v4\n\s+with:\n\s+path: ([^\n]+)/)?.[1].trim();
  const snapshotPath = workflow.match(/run: node scripts\/preserve-versioned-assets\.mjs snapshot dist\/assets ([^\n]+)/)?.[1].trim();
  const uploadPath = workflow.match(/name: current-versioned-assets\n\s+path: ([^\n]+)/)?.[1].trim();
  const downloadPath = workflow.match(/uses: actions\/download-artifact@v4\n\s+with:\n\s+name: current-versioned-assets\n\s+path: ([^\n]+)/)?.[1].trim();
  assert.ok(restorePath, "workflow restores the previous asset cache");
  assert.equal(savePath, restorePath, "cache restore/save use identical paths and cache versions");
  assert.equal(snapshotPath, uploadPath, "the uploaded artifact is the current-only versioned snapshot");
  assert.equal(downloadPath, restorePath, "the deploy job downloads the current snapshot into the cache path");
  assert.ok(uploadPath && !uploadPath.startsWith("."), "artifact path is visible so hidden-path exclusions cannot drop it");
  assert.equal((workflow.match(/key: bitwork-public-assets-v1-/g) || []).length, 2, "restore and save share one versioned cache family");
  assert.match(workflow, /github\.run_id.*github\.run_attempt/, "each successful deployment can refresh an immutable cache key");
  assert.ok(workflow.indexOf("- name: Deploy public site") < workflow.indexOf("- name: Save successfully deployed assets"),
    "only successfully deployed asset snapshots become the next cache generation");
  assert.ok(!/  deploy:[\s\S]*?run: node scripts\//.test(workflow), "the deploy job does not depend on a checkout or source-tree script");

  console.log(JSON.stringify({ fixture: "pass", firstRunCacheMiss: true, currentNeverOverwritten: true, excluded: ["images", "HTML", "business directories"], generationAssetCounts: counts, maximumRetainedGenerations: 2, cachePathMatched: true, artifactPathMatched: true, cacheSavedAfterDeploy: true, deployNeedsNoCheckout: true }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
