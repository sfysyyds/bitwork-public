import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
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

const homeOnly=(await readFile(path.join(root,"src/components/PageFrame.tsx"),"utf8")).includes("{home && <DotField/>}");
assert.deepEqual(html.map(page => (page.match(/<canvas class="dot-field" aria-hidden="true"><\/canvas>/g)||[]).length),paths.map((_,i)=>homeOnly&&i>0?0:1));
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
const motion = await readFile(path.join(root,"src/motion-preference.ts"),"utf8");
assert.ok(motion.includes('matchMedia("(prefers-reduced-motion: reduce)")'), "Reduced-motion preference must be shared.");
assert.ok(component.includes("document.hidden") && component.includes('document.addEventListener("visibilitychange",start)'));
assert.ok(component.includes('window.addEventListener("pointermove",pointer,{passive:true})'));

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
const responsive=model.createField(390,844,()=>.5).scale<1;
if(responsive){
 const phone=model.createField(390,844,()=>.5),pc=model.createField(1440,900,()=>.5);
 assert.equal(phone.scale,.55);assert.ok(phone.step<14);assert.equal(pc.scale,1);assert.equal(pc.step,22);
 assert.ok(component.includes("xx/scale,yy/scale")&&component.includes("px/scale,py/scale"));
 assert.ok(component.includes("radius=(.65+strength*1.15)*scale"));
}
const monochrome=component.includes("rgba(255,255,255,${alpha})");
if(monochrome){
  assert.ok(component.includes("const animated=()=>!reduced;"));
 assert.ok(!component.includes("pointer: fine"));
 assert.ok(component.includes('window.addEventListener("pointerdown",pointer,{passive:true})'));
 assert.ok(component.includes('window.addEventListener("pointerup",release,{passive:true})'));
 assert.ok(component.includes('window.addEventListener("pointercancel",leave,{passive:true})'));
 assert.ok(!component.includes("preventDefault"));
 assert.ok(component.includes('rgba(255,255,255,${(strength-.55)*.13})'),"Halo must stay monochrome too");
  const raf=new Map(),windowListeners=new Map(),documentListeners=new Map();let nextFrame=0,cleanup,paints=0,maxInfluence=0,lastInfluence=Infinity;
 const context={fillStyle:"",clearRect(){paints++;},beginPath(){},arc(){},fill(){},setTransform(){}};
 const canvas={width:0,height:0,getContext:()=>context};
 const win={innerWidth:390,innerHeight:844,addEventListener:(n,f)=>windowListeners.set(n,f),removeEventListener:n=>windowListeners.delete(n)};
 const doc={hidden:false,addEventListener:(n,f)=>documentListeners.set(n,f),removeEventListener:n=>documentListeners.delete(n)};
  const runtimeSource=component.replace(/^import .*;\r?\n/gm,"").replace("export default function DotField()","function DotField()").replace("const { reduced } = useReducedEffects();","const reduced=globalThis.__reduced;")+"\nglobalThis.__DotField=DotField;";
 const {code:runtimeCode}=await (await import("esbuild")).transform(runtimeSource,{loader:"tsx",jsx:"transform"});
  const runtime={React:{createElement:()=>null},useRef:()=>({current:canvas}),useEffect:fn=>{cleanup?.();cleanup=fn();},createField:model.createField,__reduced:false,
  sampleField:(...args)=>{lastInfluence=args[5];maxInfluence=Math.max(maxInfluence,lastInfluence);return model.sampleField(...args);},window:win,document:doc,devicePixelRatio:3,
  requestAnimationFrame:fn=>{const id=++nextFrame;raf.set(id,fn);return id;},cancelAnimationFrame:id=>raf.delete(id),Math};
 vm.runInNewContext(runtimeCode,runtime);runtime.__DotField();
 const tick=now=>{const [id,fn]=raf.entries().next().value||[];assert.ok(fn,"Mobile animation should keep scheduling frames");raf.delete(id);fn(now);};
 const mobileInitial=paints;tick(16);tick(50);assert.ok(paints>mobileInitial,"Coarse-pointer mobile should animate without mouse input");
 windowListeners.get("pointerdown")({pointerType:"touch",clientX:110,clientY:140});tick(84);assert.ok(maxInfluence>0,"Touch should wake the field");
 windowListeners.get("pointerup")({pointerType:"touch"});tick(118);assert.ok(lastInfluence<maxInfluence,"Touch wake should fade after release");
  runtime.__reduced=true;runtime.__DotField();assert.equal(raf.size,0,"Reduced-motion should stop animation");
  doc.hidden=true;documentListeners.get("visibilitychange")();assert.equal(raf.size,0,"Hidden page should not animate");doc.hidden=false;runtime.__reduced=false;runtime.__DotField();assert.equal(raf.size,1,"Visible mobile page should resume");
  cleanup();assert.equal(raf.size,0);assert.equal(windowListeners.size,0);assert.equal(documentListeners.size,0);
}else assert.ok(component.includes("rgba(50,140,255"));
assert.ok(component.includes("()=>seed"),"Resize must preserve the light pattern seed");
console.log(JSON.stringify({modified:"PASS",behavior:responsive?"fine monochrome responsive mobile flow":monochrome?"monochrome mobile at desktop scale":"blue ambient flow, mobile disabled",routes:paths.length,backgroundScope:homeOnly?"home only":"all routes",largestFrameDelta,range,gridCap:3600,pointer:"exponentially eased",layout:baselineRoot?"baseline-identical":"fixture rendered",networkApis:"none"}));