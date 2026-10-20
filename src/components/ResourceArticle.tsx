"use client";

import { useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import ResourceActions from "./ResourceActions";
import type { ResourceItem } from "../types";
import { sitePath } from "../site-path";
import { resourceImageProps } from "../resource-images";

export function resourceMediaUrl(value: string | undefined) {
  const url = value?.trim();
  if (!url) return "";
  if (url.startsWith("/media/") && !url.startsWith("//")) return sitePath(url);
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
  } catch {
    return "";
  }
}

export function resourceCoverStyle(id: string): CSSProperties {
  return { "--resource-cover-transition": `resource-cover-${id.replace(/[^a-zA-Z0-9_-]/g, "-")}` } as CSSProperties;
}

export function CoverPixels({ src, sizes }: { src: string; sizes: string }) {
  return [2, 4, 8].map(size => <img key={size} className={`resource-cover-pixels resource-cover-pixels-${size}`} {...resourceImageProps(src, sizes)} alt="" aria-hidden="true" loading="lazy" />);
}

function Section({ id, title, children }: { id: string; title: string; children: string }) {
  return <section className="resource-article-section" id={id} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{title}</h2>
    <div className="resource-prose">{children.trim() || <span className="resource-empty">尚未提供</span>}</div>
  </section>;
}

export default function ResourceArticle({ resource }: { resource: ResourceItem }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeShot, setActiveShot] = useState<number | null>(null);
  const shots = (resource.screenshots ?? []).filter(shot => resourceMediaUrl(shot.url));
  const cover = resourceMediaUrl(resource.coverUrl);
  const intro = resource.intro?.trim() ?? "";
  const description = resource.description?.trim() || intro;
  const summary = intro && intro !== description ? intro : "";
  const leadSections = [
    ...(summary ? [{ id: "summary", title: "简介", content: summary }] : []),
    { id: "overview", title: "作品介绍", content: description },
  ].filter(section => section.content);
  const otherSections = [
    { id: "installation", title: "安装说明", content: resource.installation?.trim() ?? "" },
    { id: "changelog", title: "更新记录", content: resource.changelog?.trim() ?? "" },
    { id: "credits", title: "制作名单", content: resource.credits?.trim() ?? "" },
  ].filter(section => section.content);
  const hasDetails = leadSections.length > 0 || otherSections.length > 0 || shots.length > 0;
  const selectedShot = activeShot === null ? null : shots[activeShot];

  function openShot(index: number) {
    const dialog = dialogRef.current;
    if (!dialog || !shots[index]) return;
    setActiveShot(index);
    if (!dialog.open) dialog.showModal();
  }

  function closeShot() {
    const dialog = dialogRef.current;
    setActiveShot(null);
    if (dialog?.open) dialog.close();
  }

  return <article className="resource-article">
    <header className="resource-hero">
      <div className="resource-hero-cover" style={resourceCoverStyle(resource.id)}>
        {cover ? <>
          <CoverPixels src={resource.coverUrl} sizes="(max-width: 600px) calc(100vw - 40px), 510px"/>
          <img className="resource-cover-original" {...resourceImageProps(resource.coverUrl, "(max-width: 600px) calc(100vw - 40px), 510px")} alt={`${resource.title}封面`} fetchPriority="high" />
        </> : <span role="img" aria-label="暂无封面，显示作品标题首字">{resource.title.slice(0, 1) || "?"}</span>}
      </div>
      <div className="resource-hero-copy">
        <p className="resource-category">{resource.genre || "类型未填写"}</p>
        <h1>{resource.title}</h1>
        {resource.english && <p className="resource-original-title">{resource.english}</p>}
        {resource.version?.trim() && <dl className="resource-facts"><div><dt>版本</dt><dd>{resource.version.trim()}</dd></div></dl>}
        <ResourceActions downloadUrl={resource.downloadUrl} articleUrl={resource.articleUrl}/>
      </div>
    </header>

    {hasDetails && <div className="resource-article-layout">
      <nav className="resource-toc" aria-label="页面目录">
        <strong>本页内容</strong>
        {leadSections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
        {shots.length > 0 && <a href="#screenshots">游戏截图</a>}
        {otherSections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
      </nav>
      <div className="resource-article-body">
        {leadSections.map(section => <Section key={section.id} id={section.id} title={section.title}>{section.content}</Section>)}
        {shots.length > 0 && <section className="resource-article-section" id="screenshots" aria-labelledby="screenshots-title">
          <h2 id="screenshots-title">游戏截图</h2>
          <button className="resource-gallery-stack" type="button" data-count={shots.length} onClick={() => openShot(0)} aria-label={`查看全部 ${shots.length} 张 CG`}>
            <span className="resource-gallery-stack-front">
              <img {...resourceImageProps(shots[0].url, "(max-width: 640px) calc(100vw - 52px), 460px")} alt="" loading="lazy" />
              <span className="resource-gallery-stack-copy"><span><Images size={17}/>查看全部 CG</span><small>{shots.length} 张<ChevronRight size={16}/></small></span>
            </span>
          </button>
          <div className="resource-gallery">{shots.map((shot, index) => <button className="resource-shot" type="button" key={`${shot.url}-${index}`} onClick={() => openShot(index)} aria-label={`放大查看截图 ${index + 1}`}>
            <img {...resourceImageProps(shot.url, "(max-width: 600px) calc(100vw - 40px), (max-width: 1100px) 40vw, 460px")} alt={shot.caption || `${resource.title}截图 ${index + 1}`} loading="lazy" />
            <span>{shot.caption?.trim() || `截图 ${index + 1}`}</span>
          </button>)}</div>
        </section>}
        {otherSections.map(section => <Section key={section.id} id={section.id} title={section.title}>{section.content}</Section>)}
      </div>
    </div>}

    <dialog className="resource-lightbox" ref={dialogRef} aria-label="截图预览" onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        openShot((activeShot ?? 0) + (event.key === "ArrowLeft" ? -1 : 1));
      }
    }} onCancel={event => { event.preventDefault(); closeShot(); }} onClick={event => {
      if (event.target === dialogRef.current) closeShot();
    }}>
      <header className="resource-lightbox-toolbar">
        <span>截图预览 {activeShot !== null && <small>{activeShot + 1} / {shots.length}</small>}</span>
        <button className="resource-lightbox-close" type="button" onClick={closeShot} aria-label="关闭截图"><X size={20}/></button>
      </header>
      {selectedShot && <figure>
        <div className="resource-lightbox-image" onClick={event => { if (event.target === event.currentTarget) closeShot(); }}>
          <img src={resourceMediaUrl(selectedShot.url)} alt={selectedShot.caption || `${resource.title}截图 ${(activeShot ?? 0) + 1}`} decoding="async" />
        </div>
        <figcaption className="resource-lightbox-caption">{selectedShot.caption?.trim() || `截图 ${(activeShot ?? 0) + 1}`}</figcaption>
      </figure>}
      {selectedShot && shots.length > 1 && <nav className="resource-lightbox-nav" aria-label="CG 翻页">
        <button type="button" disabled={activeShot === 0} onClick={() => openShot((activeShot ?? 0) - 1)}><ChevronLeft size={18}/>上一张</button>
        <button type="button" disabled={activeShot === shots.length - 1} onClick={() => openShot((activeShot ?? 0) + 1)}>下一张<ChevronRight size={18}/></button>
      </nav>}
    </dialog>
  </article>;
}
