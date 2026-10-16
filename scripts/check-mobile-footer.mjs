import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const page=fs.readFileSync(path.join(root,'src/pages/Resources.tsx'),'utf8'),css=fs.readFileSync(path.join(root,'src/styles/community-codes.css'),'utf8');
const grid=css.includes('display:grid!important');
const subtitle=grid?'团本齐心合力之作':'作品介绍、版本与获取方式。';assert.ok(page.includes('<p>'+subtitle+'</p>'));
if(grid){assert.ok(css.includes('grid-template-columns:minmax(0,1fr) auto'));assert.ok(css.includes('align-items:flex-end'));assert.ok(css.includes('align-items:end'));assert.ok(!css.includes('flex:1 0 100%'));assert.ok(css.includes('white-space:nowrap;font-size:10px'));}
else{assert.ok(css.includes('flex:1 0 100%'));assert.ok(css.includes('.community-code{display:flex;align-items:center;'));}
console.log(JSON.stringify({subtitle,mobileFooter:grid?'single-row bottom-aligned':'timestamp full row; codes below',bottomAligned:grid,logoLabels:css.includes('writing-mode:vertical-rl')?'vertical':'horizontal beneath logo'}));
