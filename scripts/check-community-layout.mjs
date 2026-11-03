import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {build} from 'esbuild';
const root=path.resolve(process.argv[2]||path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const require=createRequire(path.join(root,'package.json')),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
async function render(name,props={}){
 const bundle=await build({entryPoints:[path.join(root,'src/components/'+name+'.tsx')],bundle:true,write:false,format:'cjs',platform:'node',packages:'external',jsx:'automatic',define:{'import.meta.env.BASE_URL':'"/"','import.meta.env.VITE_WORKBENCH_HOST':'"https://work.bitwork.top"'}});
 const mod={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(require,mod,mod.exports);
 return renderToStaticMarkup(React.createElement(mod.exports.default,props));
}
const home=await render('CommunityCodes'),actions=await render('ResourceActions',{downloadUrl:'https://github.com/sfysyyds/bitwork-public/releases/download/test/patch.zip',articleUrl:'https://www.bilibili.com/opus/123456789'});
const css=readFileSync(path.join(root,'src/styles/community-codes.css'),'utf8');
const vertical=css.includes('writing-mode:vertical-rl'),icons=(home.match(/class="community-platform-icon"/g)||[]).length;
const popupOnly=!home.includes('/assets/community/')&&icons===3;
const note=/<small class="patch-download-note">([^<]*)<\/small>/.exec(actions)?.[1];
assert.ok(home.includes('加入我们，放大二维码')&&home.includes('赞助我们，放大二维码'));
assert.ok(home.includes('QQ群，放大二维码'));
const contactActions=(home.match(/aria-haspopup="dialog"/g)||[]).length;
assert.equal(contactActions,3);
assert.ok(actions.includes('补丁下载')&&actions.includes('测速线路')&&actions.includes('查看文章'));
assert.ok(actions.includes('<a class="resource-download" href="https://github.com/sfysyyds/bitwork-public/releases/download/test/patch.zip"')&&!actions.includes("<noscript>"),"Patch link must be a real SSR fallback, not a noscript-only link.");
assert.ok(note?.includes('代理为第三方服务'));
if(popupOnly){
 assert.equal((home.match(/<img /g)||[]).length,3);assert.equal(icons,3);assert.ok(!vertical);assert.ok(css.includes('width:28px;height:28px'));
 assert.ok(home.includes('alt="QQ"')&&home.includes('alt="微信"'));
}else if(vertical){
 assert.equal(icons,3);assert.ok(home.includes('alt="QQ"')&&home.includes('alt="微信"'));
 assert.ok(css.includes('text-orientation:upright'));
 for(const file of ['qq.svg','wechat.svg']){const svg=readFileSync(path.join(root,'public/assets',file),'utf8');assert.ok(svg.includes('CC BY 4.0')&&svg.includes('<path'));assert.ok(!/<script|<image|href=/i.test(svg));}
}else{assert.equal(icons,0);}
console.log(JSON.stringify({labelOrientation:vertical?'vertical':'horizontal',platformIcons:icons,popupOnly,proxyNote:note,enlargementEntries:contactActions,threeDownloadActions:true,serverRendered:true}));