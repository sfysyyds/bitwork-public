import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
const source=path.resolve(process.argv[2] || '.');const fixed=process.argv.includes('--expect-fixed');const temp=await mkdtemp(path.join(os.tmpdir(),'f1-fixture-'));
try {
 for(const dir of ['scripts','src/data','resources','public']) await mkdir(path.join(temp,dir),{recursive:true});
 const script=path.join(temp,'scripts/snapshot-public-resources.mjs');await copyFile(path.join(source,'scripts/snapshot-public-resources.mjs'),script); await copyFile(path.join(source,'scripts/preflight.mjs'),path.join(temp,'scripts/preflight.mjs'));
 const run=(cover)=>{const code=`let calls=[];globalThis.fetch=async u=>{calls.push(String(u));if(String(u).endsWith('/api/site-catalog'))return Response.json({items:[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',coverUrl:${JSON.stringify(cover)},screenshots:[{url:'/api/resource-media/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}]}],publicRevision:'a'.repeat(64)});if(String(u).includes('/api/resource-media/')) return new Response(new Uint8Array([137,80,78,71,1]),{headers:{'content-type':'image/png'}});throw Error('unexpected fetch '+u)};process.on('exit',()=>console.log('FETCHES '+JSON.stringify(calls)));process.argv[1]=${JSON.stringify(script)};await import(${JSON.stringify(pathToFileURL(script).href)});`;return spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',env:{...process.env,PUBLISH_ID:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}})};
 // External sources are copied and DNS-pinned, never left as remote manifest URLs.
 const inputs=['https://127.0.0.1/cover.png','http://example.invalid/x','javascript:alert(1)','https://u:p@example.invalid/x','https://','/api/private/1','https://work.bitwork.top/api/private/1'];
 for(const input of inputs){const r=run(input);assert.equal(r.status,1);assert.ok(!r.stdout.includes('https://images.example.invalid')); console.log(JSON.stringify({input,exit:r.status,stdout:r.stdout.trim(),stderr:r.stderr.trim()}));}
 const safe=await import(pathToFileURL(path.join(source,'scripts/snapshot-public-resources.mjs')).href);if(fixed){assert.equal(typeof safe.fetchExternalImage,'function');await assert.rejects(()=>safe.fetchExternalImage('https://external.example/image.png',{},async()=>[{address:'127.0.0.1',family:4}]),/private\/reserved/);console.log('PASS external media cannot retain an unverified remote URL or reach private DNS');}
}finally{await rm(temp,{recursive:true,force:true})}

console.log(JSON.stringify({ result:'PASS', mode:fixed?'MODIFIED':'BASELINE_OR_ROLLBACK' }));
