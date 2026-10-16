# Public-site publishing runbook

## Flow

The admin workbench calls the backend, which dispatches `Publish public site <publish_id>` in this repository. GitHub Actions fetches `GET https://work.bitwork.top/api/site-catalog`, builds the allowlisted static catalog, and deploys the artifact to Pages at `https://bitwork.top/`. The published `publication.json` contains only `publishId`, `publishedAt`, and `publicRevision`; the backend polls it to confirm the requested publication.

Only a work explicitly opted into public catalog visibility is returned by `/api/site-catalog`. Drafts and the older `/api/resources` feed are not valid publishing inputs. Do not replace the endpoint or add secrets, source scripts, account data, or private R2 objects to this public repository.

## Publish or unpublish

1. Review the work in the admin backend and explicitly opt it into or out of public visibility.
2. Start the public-site workflow from the admin publish action. For manual GitHub Actions testing, leave `publish_id` blank; the commit SHA is used as the marker.
3. Treat success as complete only after the workflow deploy job succeeds and `https://bitwork.top/publication.json` returns the same `publishId` and `publicRevision`.
4. To unpublish, clear the backend's public opt-in and run the same workflow. The next successful snapshot removes only old generated resource routes and generated image files. If a stale route is hand-authored or contains extra files, cleanup refuses to delete it and the build fails for review.

## Safe checks

In a clean checkout with Node 22:

```sh
npm ci
npm run check:snapshot
```

The workflow also verifies the HTTPS backend origin, publication marker, public-field allowlist, static media, custom domain, and final output. Do not put the GitHub fine-grained Actions token in this repository or in workflow environment variables; it belongs only in the backend secret store with access restricted to `sfysyyds/bitwork-public` and Actions read/write. Never log its value.

## Common failures

- `/api/site-catalog` non-200 or malformed `publicRevision`: backend/API contract is unavailable; no Pages artifact is deployed.
- A referenced image is missing, too large, or not an allowed image MIME type: fix the public resource metadata/media, then retry.
- `unrecognized stale route`: inspect the route manually; do not force-delete it as part of publishing.
- Workflow dispatch rejected: verify the backend-only repository token has Actions read/write access and `public-site.yml` exists on the default branch.
- Backend reports pending: inspect the run with the exact `publish_id`; a build/deploy failure must not be reported as success.


## Homepage contact and support QR codes

The homepage footer uses CommunityCodes: two compact contact/support entries with a QR on the right, opening a native dialog on click. The join QR is a QQ personal-contact code, not a fabricated group-invite link; the sponsor QR is a WeChat payment code. Nothing redirects, joins, logs in, or pays automatically. The existing two-line update timestamp stays on the left. Mobile footer wraps rather than hiding or clipping the entries; QR codes never get mosaic/blur effects.

Only rebuilt black-on-white SVG and PNG assets under public/assets/community/ are published. Raw App screenshots, status bars, avatars and names are not uploaded. The QR payloads were decoded locally and re-encoded without changing their bytes; each uses H correction and four quiet modules. Independent decoding matched both original payloads at 240/288/320/384px. Runtime has no new dependency. Checks: node scripts/check-community-codes.mjs and npm run publish:build.

To change a code, use the new original screenshot as data, decode it locally (zxing-cpp 3.1.1), re-encode deterministically (qrcode 8.2), and compare decoded bytes against the original before updating both assets and scripts/community-codes.json. Never use generative drawing, logo overlays or filters inside the QR matrix. The 64px footer image is an entry/preview; use the enlarged code to scan. Keep a provenance/checksum receipt but do not put original screenshots or plaintext payment/contact payloads in logs. App acceptance and expiring QR payloads must be checked by the owner; byte-level decode verification is not a completed payment or friend request.
