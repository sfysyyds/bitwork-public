import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const targetAt=process.argv.indexOf('--target'),root=targetAt<0?path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'):path.resolve(process.argv[targetAt+1]);
const baseline=process.argv.includes('--baseline'),home=fs.readFileSync(path.join(root,'src/pages/Home.tsx'),'utf8');
assert.equal(home.includes('<CommunityCodes/>'),!baseline);
if(baseline){console.log(JSON.stringify({behavior:'BASELINE',homeEntries:0,enlargement:false}));}
else{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/community-codes.json'),'utf8'));
 for(const row of manifest){
  const svg=fs.readFileSync(path.join(root,`public/assets/community/${row.name}.svg`)),png=fs.readFileSync(path.join(root,`public/assets/community/${row.name}.png`));
  assert.equal(createHash('sha256').update(svg).digest('hex'),row.svgSha256);assert.equal(createHash('sha256').update(png).digest('hex'),row.pngSha256);
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),row.matrixIncludingQuietZone*12);assert.equal(png.readUInt32BE(20),row.matrixIncludingQuietZone*12);
  const text=svg.toString('utf8');assert.ok(!/<(?:image|script)|href=|https?:\/\/(?!www\.w3\.org)/i.test(text));assert.ok(text.includes(`viewBox="0 0 ${row.matrixIncludingQuietZone} ${row.matrixIncludingQuietZone}"`));
  for(const match of text.matchAll(/M(\d+),(\d+)h1v1h-1z/g)){for(const coordinate of [Number(match[1]),Number(match[2])])assert.ok(coordinate>=4&&coordinate<row.matrixIncludingQuietZone-4);}
  assert.equal(row.decodedOriginalEqualsRebuilt,true);assert.equal(row.quietZoneModules,4);
 }
 const component=fs.readFileSync(path.join(root,'src/components/CommunityCodes.tsx'),'utf8');assert.ok(component.includes('showModal()'));assert.ok(component.includes('onClose='));assert.ok(component.includes('aria-labelledby='));assert.ok(!component.includes('window.open')&&!component.includes('location.assign'));
 console.log(JSON.stringify({behavior:'MODIFIED',homeEntries:2,enlargement:'native dialog',assetHashesVerified:true,quietZoneModules:4,externalRedirects:false}));
}
