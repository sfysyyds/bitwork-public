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
