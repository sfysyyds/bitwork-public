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
npm run prepublish
npm run build
npm run preview
```

`npm run check:snapshot` tests stale-file cleanup, allowlisting, and fail-closed handling. `npm run publish:build` blocks missing/invalid configuration, a missing publication marker, non-public fields, API media URLs, absent assets, unexpected output, or a live backend API reference in static output.

## Publishing

`.github/workflows/public-site.yml` is the only public-site publisher. It runs on `workflow_dispatch`, fetches the approved catalog, builds with the custom-domain root path (`/`), verifies the static artifact, and deploys it to GitHub Pages. It needs no GitHub secret in Actions. The Cloudflare admin backend separately dispatches this workflow with a UUID `publish_id` using its repository-scoped GitHub Actions credential; the backend compares the generated id with the published `publication.json`. A manual Actions run can omit the id and uses its commit SHA instead. The workflow name is `Publish public site <publish_id>` for backend run tracking.

The custom domain and `CNAME` file are `bitwork.top`. Every detail route is generated from the currently approved catalog, so removing public opt-in removes its generated route and generated media on the next successful deployment. The cleanup fails closed instead of deleting a hand-authored route.

See [PUBLISHING.md](./PUBLISHING.md) for the short operator and maintenance runbook.

The published home/resource/detail pages are plain HTML/CSS/JS and static media. Each published resource gets a generated `resources/<id>/index.html`, so direct URL visits and refreshes on GitHub Pages do not depend on a server-side route or SPA-only history fallback.
