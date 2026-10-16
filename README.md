# THE NEW BIT public site

This repository contains only the public homepage and resource catalog. It does not contain the translation workbench, account/admin screens, server API, secrets, or Ren'Py source files.

## Data and media

`npm run snapshot` reads only `GET https://work.bitwork.top/api/site-catalog`. The backend must return only explicitly opted-in public works (`site_public = 1`), an allowlisted `items` array, and its SHA-256 `publicRevision`. The build projects a second allowlist, copies approved image media to `public/media/`, removes only stale generated detail routes/media, and writes `public/publication.json` with `publishId`, `publishedAt`, and `publicRevision`. The publication marker lets the backend verify which publication reached Pages without putting its GitHub token in this repository.

The production catalog is intentionally empty until a formal work is approved for publication. Test resources, their media, and draft Releases are not published here. A backend administrator must explicitly opt a work into the public catalog; saving a draft alone does not publish it. Add only reviewed public records and formal GitHub Releases download links.

## Local commands

Use Node 22 and install this small package in a clean checkout with `npm ci` (do not run install commands while `node_modules` is a junction). Then:

```powershell
$env:VITE_WORKBENCH_HOST = 'https://bitwork.mossyibex4.chatgpt.site'
$env:PAGES_BASE_PATH = '/'
npm run check:publish
npm run build
npm run preview
```

`npm run check:snapshot` tests stale-file cleanup, allowlisting, and fail-closed handling. `npm run publish:build` blocks missing/invalid configuration, a missing publication marker, non-public fields, API media URLs, absent assets, unexpected output, or a live backend API reference in static output.

## Publishing

`.github/workflows/public-site.yml` is the only public-site publisher. It runs on `workflow_dispatch`, fetches the approved catalog, builds with the custom-domain root path (`/`), verifies the static artifact, and deploys it to GitHub Pages. It needs no GitHub secret in Actions. The Cloudflare admin backend separately dispatches this workflow with a UUID `publish_id` using its repository-scoped GitHub Actions credential; the backend compares the generated id with the published `publication.json`. A manual Actions run can omit the id and uses its commit SHA instead. The workflow name is `Publish public site <publish_id>` for backend run tracking.

The custom domain and `CNAME` file are `bitwork.top`. Every detail route is generated from the currently approved catalog, so removing public opt-in removes its generated route and generated media on the next successful deployment. The cleanup fails closed instead of deleting a hand-authored route.

See [PUBLISHING.md](./PUBLISHING.md) for the short operator and maintenance runbook.

The published home/resource/detail pages are plain HTML/CSS/JS and static media. Each published resource gets a generated `resources/<id>/index.html`, so direct URL visits and refreshes on GitHub Pages do not depend on a server-side route or SPA-only history fallback.


## 2026-10-16 资源详情操作
- 详情共用 ResourceActions：直接下载 / 代理下载 / 查看文章。后台每个作品有独立 articleUrl（HTTPS、无URL凭据）；D1增量0009仅添加默认空的 article_url，不修改旧资料。公开快照和发布预检允许该字段，未填写文章时按钮禁用，不猜测文章链接。
- 代理仅接受公开 GitHub Release 文件直链，不接受查询参数、凭据或任意URL。清单为 ghproxy.net、ghfast.top、gh-proxy.com（来源见 resource-downloads.ts；不是所有互联网公益站点）。访客点击后才并行测试，omit credentials/no-referrer，每站读取最多128 KiB、6秒超时；必须206且可验证 Content-Range，不用不透明 no-cors 回应冒充测速。按读取字节/耗时选择本次小样本最快节点，随后浏览器发起下载。跨域受限、错误HTML、忽略Range、超时全失败时明确建议直链，不谎称找到最快节点。
- 只在访客浏览器测试/下载，不经过本站 Worker/R2；第三方代理可能看到公开文件地址和访客IP，不能保证持续速度或文件完整性。切换作品/离开时取消测速。未新增后台代理下载或付费服务。
- 检查：node --experimental-strip-types scripts/check-resource-downloads.mjs；node scripts/check-resource-wiki.mjs --target . --probe --expect-fixed --expect-article；node scripts/check-site-publication.mjs；TypeScript及完整构建。公开站运行 check:snapshot、publish:build。四角色追加 resource-actions/；回退 sh ROLLBACK.sh --resource-actions TARGET_COPY_DIRECTORY（子目录 backend/ 和 public/）。源码回退保留兼容新增列，不执行DROP或覆盖用户资料。
- 最新远端提交、Worker版本、正式Pages工作流和线上回读以 outputs/resource-actions/status.json 为准。若本地GitHub传输失败但REST发布成功，本地原始检出仍可停在旧基线，不能把它误当线上最新源码；本轮公共源码副本在 work/resource-actions-public。
