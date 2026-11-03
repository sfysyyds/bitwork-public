import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { build } from "esbuild";
const root=path.resolve(process.argv[2]||"."),require=createRequire(path.join(root,"package.json"));
async function bundle(entry,plugins=[]) { return (await build({entryPoints:[path.join(root,entry)],bundle:true,write:false,platform:"node",format:"cjs",packages:"external",jsx:"automatic",plugins})).outputFiles[0].text; }
async function observe(reduced,hidden=false){
 const frames=new Map(),events=new Map();let next=0,paints=0,cleanup;
 const ctx=new Proxy({clearRect(){paints++;}}, {get:(o,k)=>o[k]||(()=>{})});
 const canvas={width:0,height:0,getContext:()=>ctx};
 const react={useRef:()=>({current:canvas}),useEffect:fn=>{cleanup=fn();}};
 const window={innerWidth:390,innerHeight:844,addEventListener:(k,fn)=>events.set(k,fn),removeEventListener(){}};
 const document={hidden,addEventListener:(k,fn)=>events.set(k,fn),removeEventListener(){}};
 // The manual static setting is deliberately separate from the OS reduced-motion setting.
 const code=await bundle("src/components/DotField.tsx",[{name:"manual-static-fixture",setup(b){b.onLoad({filter:/motion-preference\.ts$/},()=>({contents:`export function useReducedEffects(){return {reduced:${reduced},systemReduced:false}}`,loader:"ts"}));}}]);
 const mod={exports:{}};const scope={module:mod,exports:mod.exports,require:n=>n==="react"?react:n==="react/jsx-runtime"?{jsx:()=>null,jsxs:()=>null}:require(n),window,document,devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id),Math,performance};
 vm.runInNewContext(code,scope);mod.exports.default();
 for(let t=34;t<=30000;t+=34){const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(t);}
 const visiblePaints=paints;document.hidden=true;events.get("visibilitychange")();
 assert.equal(frames.size,0,"hidden page must stop the frame loop");cleanup();
 return {simulatedSeconds:30,visiblePaints,pendingWhenHidden:frames.size};
}
const staticMode=await observe(true),animatedMode=await observe(false);
console.log(JSON.stringify({staticMode,animatedMode}));
assert.equal(staticMode.visiblePaints,1,"manual static mode must paint once, not continuously");assert.ok(animatedMode.visiblePaints>100,"animation remains available when enabled");
const code=await bundle("src/motion-preference.ts");const m={exports:{}};new Function("require","module","exports",code)(require,m,m.exports);
for(const [system,stored,expected] of [[false,null,false],[false,"off",true],[false,"on",false],[true,"on",true],[true,null,true]])assert.equal(m.exports.effectsDisabled(system,stored),expected);
console.log("manual static / OS reduced motion / visible animation / hidden cancellation: PASS");
