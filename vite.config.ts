import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = process.cwd();
const base = process.env.PAGES_BASE_PATH || "/bitwork-public/";
const detailPages = readdirSync(resolve(root, "resources"), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(resolve(root, "resources", entry.name, "index.html")))
  .map(entry => [entry.name, resolve(root, "resources", entry.name, "index.html")] as const);

if (!base.startsWith("/") || !base.endsWith("/")) throw new Error("PAGES_BASE_PATH must start and end with '/'.");

export default defineConfig({
  base,
  cacheDir: resolve(root, ".vite-cache"),
  plugins: [react(), { name: "mosaic-navigation", transformIndexHtml: () => [{ tag: "style", children: "@view-transition { navigation: auto; }", injectTo: "head-prepend" }] }],
  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: resolve(root, "index.html"),
        resources: resolve(root, "resources/index.html"),
        ...Object.fromEntries(detailPages.map(([id, path]) => [`detail-${id}`, path])),
      },
    },
  },
  define: {
    __SITE_UPDATED_AT__: JSON.stringify(process.env.SITE_UPDATED_AT || new Date().toISOString()),
  },
});
