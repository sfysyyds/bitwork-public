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
        { file: "index.html", route: "", title: "新位元汉化组 THE NEW BIT｜汉化补丁下载", description: `新位元汉化组（THE NEW BIT）的汉化作品发布站。浏览${items.map(item => item.english ? `${item.title}（${item.english}）` : item.title).join("、") || "已发布作品"}的中文汉化补丁，查看版本、游戏截图、安装说明与更新记录。` },
        { file: "resources/index.html", route: "resources/", title: "汉化补丁下载与作品目录｜新位元汉化组", description: `新位元汉化组已发布的${items.map(item => item.english ? `${item.title}（${item.english}）` : item.title).join("、") || "游戏"}汉化补丁。按作品查看补丁下载、当前版本、游戏截图、安装说明和更新记录。` },
        ...items.map(item => {
          const name = `${item.title}${item.english ? `（${item.english}）` : ""}`;
          const version = item.version?.trim() ? ` ${item.version.trim()}` : "";
          const sections = [item.downloadUrl && "补丁下载", item.installation?.trim() && "安装说明", item.screenshots?.length && "游戏截图", item.changelog?.trim() && "更新记录"].filter(Boolean);
          return { file: `resources/${item.id}/index.html`, route: `resources/${item.id}/`, title: `${item.english || item.title} 汉化补丁${item.downloadUrl ? "下载" : "与介绍"}${item.english ? `｜${item.title}` : ""}${version} - 新位元汉化组`, description: `${name}汉化补丁${version}，由新位元汉化组（THE NEW BIT）制作。${sections.length ? `本页提供${sections.join("、")}。` : "查看作品介绍与版本资料。"}`, item };
        }),
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
          { "@type": "Organization", "@id": `${origin}/#team`, name: "新位元汉化组", alternateName: ["新位元", "THE NEW BIT", "bitwork.top"], url: `${origin}/` },
          { "@type": "WebSite", "@id": `${origin}/#website`, name: "新位元汉化组", alternateName: ["新位元", "THE NEW BIT", "bitwork.top"], url: `${origin}/`, inLanguage: "zh-CN", publisher: { "@id": `${origin}/#team` } },
          { "@type": page.item ? "WebPage" : page.route ? "CollectionPage" : "WebPage", "@id": `${page.url}#page`, url: page.url, name: page.title, description: page.description, inLanguage: "zh-CN", isPartOf: { "@id": `${origin}/#website` }, ...(page.item ? { about: { "@type": "VideoGame", name: page.item.title, ...(page.item.english ? { alternateName: page.item.english } : {}) } } : {}) },
          ...(page.item ? [{ "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "首页", item: `${origin}${base}` }, { "@type": "ListItem", position: 2, name: "汉化资源", item: `${origin}${base}resources/` }, { "@type": "ListItem", position: 3, name: page.item.title, item: page.url }] }] : []),
        ],
      };
      const image = page.item?.coverUrl ? (page.item.coverUrl.startsWith("/media/") ? `${origin}${base}${page.item.coverUrl.slice(1)}` : page.item.coverUrl) : null;
      const tags = [
        { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "96x96", href: `${origin}${base}favicon-96.png` } },
        { tag: "meta", attrs: { name: "description", content: page.description } },
        { tag: "meta", attrs: { name: "robots", content: "index, follow, max-image-preview:large" } },
        { tag: "link", attrs: { rel: "canonical", href: page.url } },
        ...Object.entries({ "og:type": "website", "og:site_name": "新位元汉化组 THE NEW BIT", "og:locale": "zh_CN", "og:title": page.title, "og:description": page.description, "og:url": page.url, ...(image ? { "og:image": image, "og:image:alt": `${page.item.title}封面` } : {}) }).map(([property, content]) => ({ tag: "meta", attrs: { property, content } })),
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
