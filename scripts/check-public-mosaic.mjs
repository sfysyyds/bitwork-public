import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const main=read('src/main.tsx'),enabled=main.includes('import "./styles/mosaic.css";');
const subtitle=enabled?'团队齐心合力之作':'团本齐心合力之作';
assert.ok(read('src/pages/Resources.tsx').includes('<p>'+subtitle+'</p>'));
if(enabled){
 const css=read('src/styles/mosaic.css');
 assert.ok(read('vite.config.ts').includes('@view-transition { navigation: auto; }'));
 assert.ok(read('vite.config.ts').includes('injectTo: "head-prepend"'));
 assert.ok(css.includes('filter: url(#browser-mosaic)'));
 assert.ok(css.includes('mix-blend-mode: normal'));
 assert.ok(css.includes('prefers-reduced-motion: reduce'));
 assert.ok(css.includes('animation: none !important'));
 assert.ok(!main.includes('addEventListener("click"')&&!main.includes('startViewTransition('));
}
console.log(JSON.stringify({subtitle,publicNavigation:enabled?'native cross-document mosaic':'no transition stylesheet',samePageInteractions:'no JS transition handler'}));
