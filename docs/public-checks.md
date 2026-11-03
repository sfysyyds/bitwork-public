# Public site checks

Run `npm run check` for the non-publishing build and registered regression checks. `npm run build` verifies the generated static artifacts; `npm run check:regression` runs the independent SSR, URL-safety, snapshot, CLI-entry, and UI checks. `npm run publish:build` remains the separate preflight/build entry. These scripts do not deploy and are not browser end-to-end tests.

`check-mobile-gallery.mjs` uses a complete fixed `ResourceArticle` fixture, so the 0/1/8 screenshot cases remain independent of catalog contents. It also compares generated detail-route directories with the current catalog, including an empty catalog; `verify-dist.mjs` checks the publication marker and rejects unpublished media/routes.

G18 cache disposition: no skip-fetch or skip-encode cache was added. Snapshot paths are already content-addressed and stale media is pruned, but the publisher cannot know a remote image's hash without fetching its bytes. A persistent derivative cache would also need keys tied to the source hash, Sharp version, and all encoding parameters. Reconsider only after a measured build bottleneck and a safe invalidation design.
