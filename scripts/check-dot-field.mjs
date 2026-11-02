import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = path.resolve(process.argv[2] || ".");
const baselineRoot = process.argv[3] && path.resolve(process.argv[3]);
const modelPath = path.join(root, "src/dot-field.ts");
const fixture = { id: "dot-ripple-check", title: "Ripple fixture", english: "", genre: "test", version: "1", intro: "fixture intro", downloadUrl: "", coverUrl: "", screenshots: [], description: "fixture detail", installation: "", changelog: "", credits: "" };
const exists = async file => { try { await readFile(file); return true; } catch { return false; } };

async function renderRoutes(sourceRoot, paths) {
  const temp = await mkdtemp(path.join(root, ".vite-cache-dot-field-"));
  try {
    const outfile = path.join(temp, "app.mjs");
    await build({ absWorkingDir: sourceRoot, entryPoints: ["src/App.tsx"], outfile, bundle: true,
      platform: "node", format: "esm", jsx: "automatic", packages: "external",
      loader: { ".css": "empty", ".ttf": "file" },
      define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.VITE_WORKBENCH_HOST": '"https://work.bitwork.top"', __SITE_UPDATED_AT__: '"2026-11-02T00:00:00Z"' },
      plugins: [{ name: "generated-image-manifest", setup(build) {
        build.onResolve({ filter: /^\.\/data\/images\.json$/ }, () => ({ path: "images.json", namespace: "dot-field-check" }));
        build.onLoad({ filter: /.*/, namespace: "dot-field-check" }, () => ({ contents: "export default {};", loader: "js" }));
        build.onResolve({ filter: /resources\.json$/ }, args => ({ path: args.path, namespace: "dot-field-resource-fixture" }));
        build.onLoad({ filter: /.*/, namespace: "dot-field-resource-fixture" }, () => ({ contents: JSON.stringify({ items: [fixture] }), loader: "json" }));
      } }],
    });
    const { default: App } = await import(pathToFileURL(outfile).href);
    return paths.map(pathname => renderToStaticMarkup(createElement(App, { pathname })));
  } finally { await rm(temp, { recursive: true, force: true }); }
}

const paths = ["/", "/resources/", `/resources/${fixture.id}/`, "/resources/not-a-real-id/"];
const html = await renderRoutes(root, paths);
const feature = await exists(modelPath);

if (!feature) {
  assert.ok(html[0].includes('class="bit-field" aria-hidden="true"'));
  assert.ok(html.every(page => !page.includes('class="dot-field"')));
  console.log(JSON.stringify({ baseline: "PASS", routes: paths.length, sharedRipple: false, homepageGlow: "legacy circle" }));
  process.exit(0);
}

assert.ok(html.every(page => (page.match(/<canvas class="dot-field" aria-hidden="true"><\/canvas>/g) || []).length === 1));
assert.ok(!html[0].includes('class="bit-field"'));
if (baselineRoot) {
  const oldHtml = await renderRoutes(baselineRoot, paths);
  for (let i = 0; i < paths.length; i++) {
    const normalize = value => {
      const ids = new Map();
      return value.replace('<canvas class="dot-field" aria-hidden="true"></canvas>', "").replace('<div class="bit-field" aria-hidden="true"></div>', "").replace(/_R_[\w]+_/g, id => {
        if (!ids.has(id)) ids.set(id, `_RID_${ids.size}_`);
        return ids.get(id);
      });
    };
    assert.equal(normalize(html[i]), normalize(oldHtml[i]), `Unrequested SSR content/layout change at ${paths[i]}`);
  }
}

const source = await readFile(modelPath, "utf8");
const component = await readFile(path.join(root, "src/components/DotField.tsx"), "utf8");
const css = await readFile(path.join(root, "src/styles/base.css"), "utf8");
assert.ok(component.includes('matchMedia("(prefers-reduced-motion: reduce)")'));
assert.ok(component.includes("document.hidden") && component.includes('document.addEventListener("visibilitychange",start)'));
assert.ok(component.includes('window.addEventListener("pointermove",pointer,{passive:true})'));
assert.ok(component.includes('event.pointerType!=="mouse"'));
assert.ok(component.includes('aria-hidden="true"'));
assert.ok(component.includes("Math.min(devicePixelRatio||1,1.5,Math.sqrt(5000000/(width*height)))"), "Canvas backing store must be capped for high-DPR screens.");
assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b/.test(component));
assert.ok(css.includes(".dot-field{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}"));
assert.ok(css.includes("#root{isolation:isolate}"));

const { code } = await (await import("esbuild")).transform(source, { loader: "ts", format: "esm" });
const model = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
if (!model.sampleField) {
 assert.ok(model.disturbField&&model.advanceField);
 console.log(JSON.stringify({baseline:"PASS",behavior:"oscillating impulse ripple",routes:paths.length}));process.exit(0);
}
let largestFrameDelta=0,range=[1,0];
for(let t=0;t<18;t+=.2)for(let y=30;y<800;y+=83)for(let x=30;x<1200;x+=91){
 const a=model.sampleField(x,y,t,540,380,.6,1.4),b=model.sampleField(x,y,t+1/30,540,380,.6,1.4);
 assert.ok(Number.isFinite(a)&&a>=0&&a<=1);range[0]=Math.min(range[0],a);range[1]=Math.max(range[1],a);largestFrameDelta=Math.max(largestFrameDelta,Math.abs(a-b));
}
assert.ok(largestFrameDelta<.012,"Ambient light must vary continuously, not flash");
assert.ok(range[1]-range[0]>.3,"Light must form visible broad patches, not a flat field");
for (const [width,height] of [[320,568],[390,844],[1920,1080],[3840,2160],[7680,4320]]) {
 const grid=model.createField(width,height,()=>.5);assert.ok((grid.columns-2)*(grid.rows-2)<=3600);
}
assert.ok(component.includes("1-Math.exp(-dt*4)"),"Pointer wake must ease in and out");
assert.ok(!component.includes("Math.abs(field.current"),"No rectified high-frequency wave flicker");
assert.ok(component.includes("rgba(50,140,255")&&component.includes("+strength*85"),"Cool-blue light palette");
assert.ok(component.includes("()=>seed"),"Resize must preserve the light pattern seed");
console.log(JSON.stringify({modified:"PASS",behavior:"smooth cool-blue fixed-dot light field",routes:paths.length,largestFrameDelta,range,gridCap:3600,pointer:"exponentially eased",layout:baselineRoot?"baseline-identical":"fixture rendered",networkApis:"none"}));
