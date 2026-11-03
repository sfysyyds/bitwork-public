import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const versionedAsset = /^.+-[A-Za-z0-9_-]{8}\.(?:m?js|css|woff2?|ttf|otf|eot)$/i;

async function listVersionedFiles(directory, missingIsEmpty = false) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (missingIsEmpty && error.code === "ENOENT") return [];
    throw error;
  }
  return entries.filter(entry => entry.isFile() && versionedAsset.test(entry.name)).map(entry => entry.name).sort();
}

export async function snapshotVersionedAssets(assetsDirectory, snapshotDirectory) {
  const names = await listVersionedFiles(assetsDirectory);
  await rm(snapshotDirectory, { recursive: true, force: true });
  await mkdir(snapshotDirectory, { recursive: true });
  for (const name of names) await copyFile(path.join(assetsDirectory, name), path.join(snapshotDirectory, name));
  return { copied: names.length, names };
}

export async function mergePreviousVersionedAssets(assetsDirectory, previousDirectory) {
  const names = await listVersionedFiles(previousDirectory, true);
  await mkdir(assetsDirectory, { recursive: true });
  let restored = 0, alreadyCurrent = 0;
  for (const name of names) {
    try {
      await copyFile(path.join(previousDirectory, name), path.join(assetsDirectory, name), constants.COPYFILE_EXCL);
      restored++;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      alreadyCurrent++;
    }
  }
  return { restored, alreadyCurrent, names };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, first, second] = process.argv.slice(2);
  if (mode === "snapshot" && first && second) {
    console.log(JSON.stringify({ mode, ...(await snapshotVersionedAssets(first, second)) }));
  } else if (mode === "merge" && first && second) {
    console.log(JSON.stringify({ mode, ...(await mergePreviousVersionedAssets(first, second)) }));
  } else {
    console.error("Usage: preserve-versioned-assets.mjs snapshot <dist/assets> <cache/current> | merge <dist/assets> <cache/previous>");
    process.exitCode = 2;
  }
}
