import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const origin = "https://bitwork.top";
const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export const jsonLd = value => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

export default function seoPages({ root, base, updatedAt }) {
  let renderPath;
  let pages;
  return {
    name: "public-search-pages",
    apply: "build",
    async buildStart() {
      const { items } = JSON.parse(await readFile(path.join(root, "src/data/resources.json"), "utf8"));
      pages = [
        { file: "index.html", route: "", title: "THE NEW BIT · 汉化组", description: "THE NEW BIT 汉化组，团队齐心合力之作。浏览已发布汉化作品、游戏介绍、版本更新与补丁下载。" },
        { file: "resources/index.html", route: "resources/", title: "汉化资源与补丁下载 · THE NEW BIT", description: `THE NEW BIT 已发布汉化作品：${items.map(item => item.title).join("、") || "作品目录"}。查看游戏介绍、截图、安装说明和版本更新。` },
        ...items.map(item => ({ file: `resources/${item.id}/index.html`, route: `resources/${item.id}/`, title: `${item.title}${item.english ? `（${item.english}）` : ""}汉化补丁与介绍 · THE NEW BIT`, description: [item.intro?.trim(), item.description?.trim()].filter(Boolean).join(" ") || `${item.title}汉化作品资料、${item.version || "当前版本"}汉化补丁、安装说明与更新记录。`, item })),
      ].map(page => ({ ...page, description: page.description.replace(/\s+/g, " ").slice(0, 200), url: `${origin}${base}${page.route}` }));
      const outfile = path.join(root, ".vite-cache/seo-render.mjs");
      await mkdir(path.dirname(outfile), { recursive: true });
      await build({
        absWorkingDir: root, entryPoints: ["src/prerender.tsx"], outfile,
        bundle: true, platform: "node", format: "esm", jsx: "automatic",
        packages: "external", loader: { ".css": "empty" },
        define: { "import.meta.env.BASE_URL": JSON.stringify(base), "import.meta.env.VITE_WORKBENCH_HOST": JSON.stringify(process.env.VITE_WORKBENCH_HOST || ""), __SITE_UPDATED_AT__: JSON.stringify(updatedAt) },
      });
      ({ renderPath } = await import(pathToFileURL(outfile).href + `?build=${Date.now()}`));
    },
    transformIndexHtml(html, context) {
      const file = path.relative(root, context.filename).split(path.sep).join("/");
      const page = pages.find(entry => entry.file === file);
      if (!page) throw new Error(`Refusing to prerender an unapproved public route: ${file}`);
      const structured = {
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", "@id": `${origin}/#team`, name: "THE NEW BIT", url: `${origin}/` },
          { "@type": "WebSite", "@id": `${origin}/#website`, name: "THE NEW BIT", url: `${origin}/`, inLanguage: "zh-CN", publisher: { "@id": `${origin}/#team` } },
          { "@type": page.item ? "WebPage" : page.route ? "CollectionPage" : "WebPage", "@id": `${page.url}#page`, url: page.url, name: page.title, description: page.description, inLanguage: "zh-CN", isPartOf: { "@id": `${origin}/#website` }, ...(page.item ? { about: { "@type": "VideoGame", name: page.item.title, ...(page.item.english ? { alternateName: page.item.english } : {}) } } : {}) },
          ...(page.item ? [{ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "首页", item: `${origin}${base}` }, { "@type": "ListItem", position: 2, name: "汉化资源", item: `${origin}${base}resources/` }, { "@type": "ListItem", position: 3, name: page.item.title, item: page.url }] }] : []),
        ],
      };
      const image = page.item?.coverUrl ? `${origin}${base}${page.item.coverUrl.replace(/^\//, "")}` : null;
      const tags = [
        { tag: "meta", attrs: { name: "description", content: page.description } },
        { tag: "meta", attrs: { name: "robots", content: "index, follow, max-image-preview:large" } },
        { tag: "link", attrs: { rel: "canonical", href: page.url } },
        ...Object.entries({ "og:type": "website", "og:site_name": "THE NEW BIT", "og:locale": "zh_CN", "og:title": page.title, "og:description": page.description, "og:url": page.url, ...(image ? { "og:image": image, "og:image:alt": `${page.item.title}封面` } : {}) }).map(([property, content]) => ({ tag: "meta", attrs: { property, content } })),
        { tag: "meta", attrs: { name: "twitter:card", content: image ? "summary_large_image" : "summary" } },
        { tag: "script", attrs: { type: "application/ld+json" }, children: jsonLd(structured) },
      ];
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(page.title)}</title>`);
      if (!html.includes('<div id="root"></div>')) throw new Error("Public HTML root must remain an empty source template.");
      html = html.replace('<div id="root"></div>', `<div id="root" data-prerendered="true">${renderPath(`${base}${page.route}`)}</div>`);
      return { html, tags };
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\nSitemap: ${origin}${base}sitemap.xml\n` });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${escape(page.url)}</loc></url>`).join("\n")}\n</urlset>\n` });
    },
  };
}
