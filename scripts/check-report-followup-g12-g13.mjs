import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import Module, { createRequire } from "node:module";
import { build } from "esbuild";

const root = path.resolve(process.argv[2] || "."), phase = process.argv[3] || "MODIFIED";
const require = createRequire(import.meta.url);
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const cssText = fs.readFileSync(process.env.REPORT_CSS_PATH || path.join(root, "src/styles/resources.css"), "utf8");
const postcss = require("postcss"), css = postcss.parse(cssText);
const declarations = [];
css.walkDecls(decl => { if (decl.prop === "font-size" || decl.prop === "font") declarations.push(decl); });
const fixedFontPx = declarations.filter(decl => /(?:^|\s|\()\d+(?:\.\d+)?px(?:\/|\s|\)|$)/.test(decl.value)).length;
const remSizes = declarations.flatMap(decl => [...decl.value.matchAll(/([\d.]+)rem\b/g)].map(match => Number(match[1])));
const belowMinimumRem = remSizes.filter(size => size < 0.75).length;
function ruleHas(selector, property, value) {
  let found = false;
  css.walkRules(rule => {
    if (rule.selectors?.includes(selector)) rule.walkDecls(property, decl => { if (value === undefined || decl.value === value) found = true; });
  });
  return found;
}

const responsiveProblems = {
  headerCanWrap: ruleHas(".resources-header", "flex-wrap", "wrap") && ruleHas(".resources-header", "height", "auto"),
  cardMetaCanWrap: ruleHas(".resources-card-meta", "flex-wrap", "wrap") && ruleHas(".resources-card-meta span:last-child", "white-space", "normal"),
  longCardTitleCanWrap: ruleHas(".resources-card h3", "overflow-wrap", "anywhere"),
  factsCanWrap: ruleHas(".resource-facts dd", "overflow-wrap", "anywhere") && ruleHas(".resource-facts div", "max-width", "100%"),
};
if (phase === "BASELINE") {
  assert.ok(fixedFontPx > 0, "baseline should expose fixed-pixel text sizes");
  assert.ok(!responsiveProblems.headerCanWrap && !responsiveProblems.cardMetaCanWrap && !responsiveProblems.longCardTitleCanWrap,
    "baseline should record the narrow/zoom wrapping gap");
} else {
  assert.equal(fixedFontPx, 0, "resource typography must follow the root font size");
  assert.equal(belowMinimumRem, 0, "auxiliary type must remain at least approximately .75rem");
  assert.ok(Object.values(responsiveProblems).every(Boolean), "long labels/titles must wrap instead of forcing overflow");
}

const home = read("src/pages/Home.tsx"), article = read("src/components/ResourceArticle.tsx");
const baseCss = read("src/styles/base.css");
assert.equal((home.match(/<BitScene\s*\/>/g) || []).length, 2, "desktop/mobile variants should remain represented for the hidden-copy check");
assert.equal((home.match(/<PixelText\b/g) || []).length, 2, "desktop/mobile variants should remain represented for the hidden-copy check");
assert.ok(baseCss.includes(".mobile-home{display:none}") && baseCss.includes(".landing-core,.landing-footer,.landing-header{display:none}"), "desktop/mobile DOM copies are hidden by breakpoint CSS");
assert.ok(!/requestAnimationFrame|IntersectionObserver|ResizeObserver/.test(article), "resource gallery copies must not own a JS animation/observer loop");
assert.ok(cssText.includes(".resource-gallery{display:none;"), "the desktop gallery is hidden at the mobile breakpoint");
assert.ok(cssText.includes(".resource-gallery-stack{display:block;"), "the mobile stack is the visible gallery at the mobile breakpoint");

async function hiddenCopyFrameCheck(entry) {
  const bundled = await build({
    entryPoints: [path.join(root, entry)], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic",
    plugins: [{ name: "reduced-effects-fixture", setup(builder) {
      builder.onLoad({ filter: /motion-preference\.ts$/ }, () => ({ contents: "export function useReducedEffects(){ return { reduced: false, systemReduced: false }; }", loader: "ts" }));
    } }],
  });
  const raf = { calls: 0, cancelCalls: 0 };
  const context = new Proxy({ getImageData: () => ({ data: new Uint8ClampedArray(320 * 360 * 4) }) }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  const fakeCanvas = () => ({ width: 320, height: 360, clientWidth: 320, getContext: () => context });
  const rootEl = { getBoundingClientRect: () => ({ width: 160, height: 40, left: 0, top: 0 }), addEventListener() {}, removeEventListener() {} };
  const canvasEl = fakeCanvas();
  const refs = entry.includes("BitScene") ? [canvasEl] : [rootEl, canvasEl];
  let refIndex = 0, cleanup = () => {}, observed = 0;
  const react = { useRef: () => ({ current: refs[refIndex++] }), useEffect: effect => { cleanup = effect() || (() => {}); } };
  const docEvents = new Map();
  const document = {
    hidden: false, fonts: { ready: { then(callback) { queueMicrotask(callback); } } },
    createElement: () => fakeCanvas(), addEventListener: (name, fn) => docEvents.set(name, fn), removeEventListener() {},
  };
  const window = { addEventListener() {}, removeEventListener() {}, innerWidth: 320, innerHeight: 640 };
  class HiddenIntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe(target) { observed++; this.callback([{ target, isIntersecting: false }]); }
    disconnect() {}
  }
  class FakeResizeObserver { observe() {} disconnect() {} }
  const globals = {
    module: { exports: {} }, exports: {}, require: name => name === "react" ? react : require(name), window, document,
    IntersectionObserver: HiddenIntersectionObserver, ResizeObserver: FakeResizeObserver, devicePixelRatio: 1,
    getComputedStyle: () => ({ fontWeight: "700", fontSize: "24px", fontFamily: "sans-serif", letterSpacing: "0px", color: "white" }),
    requestAnimationFrame: () => { raf.calls++; return raf.calls; }, cancelAnimationFrame: () => { raf.cancelCalls++; },
    Math, performance,
  };
  const mod = new Module(path.join(root, entry)); mod.filename = path.join(root, entry); mod.paths = Module._nodeModulePaths(path.dirname(mod.filename));
  mod.require = name => name === "react" ? react : require(name);
  vm.runInNewContext(bundled.outputFiles[0].text, globals);
  globals.module.exports.default(entry.includes("PixelText") ? { text: "THE NEW BIT", interactive: true } : {});
  cleanup();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(observed, 1);
  assert.equal(raf.calls, 0, `${entry} must not schedule frames while the duplicate is non-intersecting`);
  return { intersectionObserverTargets: observed, hiddenRafRequests: raf.calls, cleanupCancelCalls: raf.cancelCalls };
}

const hiddenCopies = {
  bitScene: await hiddenCopyFrameCheck("src/components/BitScene.tsx"),
  pixelText: await hiddenCopyFrameCheck("src/components/PixelText.tsx"),
};
console.log(JSON.stringify({
  phase, passed: true, input: { rootFontPx: 32, titleCase: "long unbroken title/version/category", viewportSamplesForBrowser: [320, 360, 640, 768, 900, 1024, 1280, 1440] },
  fixedFontPx, minimumRemFont: remSizes.length ? Math.min(...remSizes) : null, belowMinimumRem, responsiveProblems,
  g13: { hiddenHomeCopies: { bitScene: 2, pixelText: 2 }, hiddenCopies, resourceGalleryOwnsJsObserversOrRaf: false, browserVisualCheck: "not run; parent controls browser" },
}));
