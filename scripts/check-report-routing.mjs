import assert from "node:assert/strict";
import path from "node:path";
import {gzipSync} from "node:zlib";
import { build } from "esbuild";
const root=path.resolve(process.argv[2]||".");
const marker="UNIQUE_RESOURCE_BODY_NOT_NEEDED_ON_HOME";
const item={id:"abcd",title:"fixture",english:"fixture",description:marker,intro:"intro",screenshots:[],downloadUrl:"",coverUrl:"",version:"1",genre:"",installation:"",changelog:"",credits:""};
const result=await build({absWorkingDir:root,entryPoints:["src/main.tsx"],bundle:true,write:false,outdir:".route-check",format:"esm",splitting:true,minify:true,metafile:true,jsx:"automatic",loader:{".css":"empty",".ttf":"file"},define:{"import.meta.env.BASE_URL":'"/"',"import.meta.env.VITE_WORKBENCH_HOST":'"https://work.bitwork.top"',__SITE_UPDATED_AT__:'"2026-11-03T00:00:00Z"'},plugins:[{name:"same-catalog-input",setup(b){b.onResolve({filter:/data\/images\.json$/},()=>({path:"images",namespace:"fixture"}));b.onLoad({filter:/.*/,namespace:"fixture"},()=>({contents:"{}",loader:"json"}));b.onLoad({filter:/data[\\/]resources\.json$/},()=>({contents:JSON.stringify({items:[item]}),loader:"json"}));}}]});
const entries=Object.entries(result.metafile.outputs);const main=entries.find(([,v])=>v.entryPoint==="src/main.tsx")[0];const home=entries.find(([,v])=>v.entryPoint==="src/pages/Home.tsx")?.[0];
const graph=new Set();function visit(key){if(graph.has(key))return;graph.add(key);for(const i of result.metafile.outputs[key].imports)if(i.kind!=="dynamic-import"&&!i.external)visit(i.path);}
visit(main);if(home)visit(home);
const files=result.outputFiles.filter(f=>graph.has(path.relative(root,f.path).split(path.sep).join("/")));const code=files.map(f=>f.text).join("\n");
console.log(JSON.stringify({homeGraphFiles:graph.size,homeJsBytes:files.reduce((n,f)=>n+f.contents.length,0),homeJsGzipBytes:files.reduce((n,f)=>n+gzipSync(f.contents).length,0),includesResourceBody:code.includes(marker),separateHomeChunk:!!home}));
assert.ok(home,"browser routes need a separate home chunk");assert.ok(!code.includes(marker),"home must not include resource bodies");
console.log("route split preserves synchronous server App and excludes resource bodies from home graph: PASS");

for(const base of ["/","/bitwork-public/"]){
 const r=await build({entryPoints:[path.join(root,"src/page-route.ts")],bundle:true,write:false,format:"cjs",platform:"node",define:{"import.meta.env.BASE_URL":JSON.stringify(base)}});const m={exports:{}};new Function("module","exports",r.outputFiles[0].text)(m,m.exports);const route=m.exports.pageRoute;
 assert.equal(route(base).home,true);assert.equal(route(base.slice(0,-1)).home,true);assert.equal(route(base+"resources/").id,undefined);assert.equal(route(base+"resources/abcd/").id,"abcd");assert.equal(route(base+"resources/%E0/").id,"");assert.equal(route(base+"missing").home,false);
}
console.log("root/subpath/trailing slash/encoded invalid route checks: PASS");
