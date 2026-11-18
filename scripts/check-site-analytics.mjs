import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, rmSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = path.resolve(".");
const temp = mkdtempSync(path.join(tmpdir(), "bitwork-public-analytics-"));

try {
  const analyticsSource = readFileSync(path.join(root, "src/site-analytics.ts"), "utf8");
  assert.equal(
    /resources\.json|\/api\/resources|\/api\/resource-media/.test(analyticsSource),
    false,
    "site-analytics.ts must not import resources.json or reference restricted workbench APIs",
  );

  // Build src/site-analytics.ts with production VITE_WORKBENCH_HOST defined so we can unit-test client logic in Node.
  const bundle = await build({
    entryPoints: [path.join(root, "src/site-analytics.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    define: {
      "import.meta.env.VITE_WORKBENCH_HOST": JSON.stringify("https://work.bitwork.top"),
      "import.meta.env.BASE_URL": JSON.stringify("/"),
    },
  });
  const modPath = path.join(temp, "site-analytics.mjs");
  writeFileSync(modPath, bundle.outputFiles[0].contents);
  const analytics = await import(pathToFileURL(modPath).href);

  // Set up minimal DOM + Image + visibilityState mocks.
  const requests = [];
  class MockImage {
    #src = "";
    decoding = "";
    referrerPolicy = "";
    onload = null;
    onerror = null;
    set src(value) {
      this.#src = value;
      requests.push({
        url: value,
        decoding: this.decoding,
        referrerPolicy: this.referrerPolicy,
      });
    }
    get src() {
      return this.#src;
    }
  }

  const listeners = new Map();
  const mockDocument = {
    prerendering: false,
    visibilityState: "visible",
    addEventListener(type, fn) {
      const set = listeners.get(type) ?? new Set();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type) {
      for (const fn of [...(listeners.get(type) ?? [])]) {
        listeners.get(type)?.delete(fn);
        fn();
      }
    },
  };

  globalThis.window = {
    Image: MockImage,
    setTimeout(fn, ms) {
      const id = globalThis.setTimeout(fn, ms);
      if (id && typeof id.unref === "function") id.unref();
      return id;
    },
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
  };
  globalThis.document = mockDocument;

  // 1. Standard views & StrictMode/double-click cooldown
  analytics.resetSiteAnalyticsCooldownForTests();
  const cleanupHome = analytics.trackPublicView("home");
  analytics.trackPublicView("home"); // suppressed within 2s cooldown
  analytics.trackPublicView("catalog");
  analytics.trackPublicView("resource", "res-alpha");
  cleanupHome();
  assert.equal(requests.length, 3);

  const u0 = new URL(requests[0].url);
  assert.equal(u0.origin, "https://work.bitwork.top");
  assert.equal(u0.pathname, "/api/site-metrics/hit");
  assert.equal(u0.searchParams.get("event"), "view");
  assert.equal(u0.searchParams.get("page"), "home");
  assert.ok(u0.searchParams.get("v"));
  assert.equal(requests[0].referrerPolicy, "strict-origin-when-cross-origin");

  const u1 = new URL(requests[1].url);
  assert.equal(u1.searchParams.get("page"), "catalog");

  const u2 = new URL(requests[2].url);
  assert.equal(u2.searchParams.get("page"), "resource");
  assert.equal(u2.searchParams.get("resource"), "res-alpha");

  // 2. Patch (direct & proxy) and game download beacons
  analytics.trackPublicDownload("patch_download", "res-alpha", "direct");
  analytics.trackPublicDownload("patch_download", "res-alpha", "proxy");
  analytics.trackPublicDownload("game_download", "res-alpha");
  assert.equal(requests.length, 6);
  assert.equal(new URL(requests[3].url).searchParams.get("route"), "direct");
  assert.equal(new URL(requests[4].url).searchParams.get("route"), "proxy");
  assert.equal(new URL(requests[5].url).searchParams.get("event"), "game_download");

  // 3. Prerendering deferral + cleanup cancellation
  requests.length = 0;
  analytics.resetSiteAnalyticsCooldownForTests();
  mockDocument.prerendering = true;
  mockDocument.visibilityState = "prerender";
  const cancelDeferred = analytics.trackPublicView("home");
  const keepDeferred = analytics.trackPublicView("catalog");
  assert.equal(requests.length, 0, "must not fire while document is prerendering");
  cancelDeferred();

  mockDocument.prerendering = false;
  mockDocument.visibilityState = "visible";
  mockDocument.dispatch("prerenderingchange");
  assert.equal(requests.length, 1, "only uncancelled listener fires once upon activation");
  assert.equal(new URL(requests[0].url).searchParams.get("page"), "catalog");
  keepDeferred();

  // 4. Built dist assertions if dist exists
  const distDir = path.join(root, "dist");
  if (existsSync(distDir)) {
    const assetsDir = path.join(distDir, "assets");
    const jsFiles = existsSync(assetsDir)
      ? readdirSync(assetsDir).filter(f => f.endsWith(".js"))
      : [];
    const combinedJs = jsFiles
      .map(f => readFileSync(path.join(assetsDir, f), "utf8"))
      .join("\n");
    assert.ok(
      combinedJs.includes("/api/site-metrics/hit"),
      "built bundle must contain public analytics hit path",
    );
    assert.equal(
      /\/api\/resources|\/api\/resource-media/.test(combinedJs),
      false,
      "built bundle must never include restricted workbench endpoints",
    );
  }

  console.log(
    JSON.stringify({
      ok: true,
      beaconEndpoint: "https://work.bitwork.top/api/site-metrics/hit",
      cooldownVerified: true,
      prerenderDeferralVerified: true,
      distChecked: existsSync(distDir),
    }),
  );
} finally {
  delete globalThis.window;
  delete globalThis.document;
  rmSync(temp, { recursive: true, force: true });
}
