# THE NEW BIT public site

This directory is a static-only prototype for the homepage and public resource catalog. It does not contain the translation workbench, account/admin screens, server API, secrets, or Ren'Py source files.

## Data and media

`src/data/resources.json` is a reviewed snapshot from the backend's published-only `GET /api/resources` endpoint. It contains an explicit public-field allowlist. Cover images and screenshots are downloaded into `public/media/`, and the manifest points to those static files so page visits do not call the backend or Cloudflare. `npm run snapshot` refreshes this snapshot and media from the currently confirmed legacy host; review the resulting diff before publishing.

The production catalog is intentionally empty until a formal work is approved for publication. Test resources, their media, and draft Releases are not published here. Add only reviewed public records and formal GitHub Releases download links; a snapshot refresh is preparation, not approval to publish everything it returns.

## Local commands

Use Node 22.13+ and install this small package in a clean checkout with `npm install` (do not run install commands while `node_modules` is a junction). Then:

```powershell
$env:VITE_WORKBENCH_HOST = 'https://bitwork.mossyibex4.chatgpt.site'
$env:PAGES_BASE_PATH = '/'
npm run prepublish
npm run build
npm run preview
```

`npm run publish:build` is the publish gate: it fails if the HTTPS workbench origin/base path is missing or invalid, the snapshot has not been refreshed, a non-public field appears, a media URL still points at `/api/`, a referenced static asset is missing, or the built output contains a live API reference/unexpected file. PAGES_BASE_PATH defaults to /bitwork-public/ so the existing GitHub Pages project URL remains valid until cutover. Build the custom-domain version with /; it includes CNAME for bitwork.top. The login link currently stays on https://bitwork.mossyibex4.chatgpt.site/login; change it to https://work.bitwork.top/login only after the Cloudflare backend and custom-domain route are live and verified.

The published home/resource/detail pages are plain HTML/CSS/JS and static media. Each published resource gets a generated `resources/<id>/index.html`, so direct URL visits and refreshes on GitHub Pages do not depend on a server-side route or SPA-only history fallback.
