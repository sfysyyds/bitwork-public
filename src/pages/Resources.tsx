import { useEffect } from "react";
import { BookOpen } from "lucide-react";
import { Brand } from "../components/Brand";
import ResourceArticle, { CoverPixels, resourceCoverStyle, resourceMediaUrl } from "../components/ResourceArticle";
import { sitePath } from "../site-path";
import type { ResourceItem } from "../types";
import snapshot from "../data/resources.json";
import "../styles/resources.css";

const items = snapshot.items as ResourceItem[];

export default function Resources({ id }: { id?: string }) {
  const activeResource = id ? items.find(item => item.id === id) ?? null : null;
  const base = sitePath();
  useEffect(() => { document.title = activeResource ? `${activeResource.title} · 汉化资源 · THE NEW BIT` : "汉化资源 · THE NEW BIT"; }, [activeResource]);
  return <main className="resources-page">
    <header className="resources-header"><Brand/><a href={id ? sitePath("resources/") : sitePath()} className="resources-home">←{id ? "作品目录" : "首页"}</a></header>
    {id ? activeResource ? <ResourceArticle resource={activeResource}/> : <div className="resources-state"><h1>未找到这项资源</h1><p>作品不存在，或尚未公开发布。</p><a href={sitePath("resources/")} className="resources-home">←返回资源目录</a></div> : <>
      <section className="resources-intro"><h1>汉化资源</h1><p>团队成员精心制作的</p></section>
      <div className="resources-list-heading"><h2>作品目录</h2><span>{items.length} 项</span></div>
      {items.length ? <section className="resources-grid" aria-label="汉化游戏列表">{items.map(resource => {
        const cover = resourceMediaUrl(resource.coverUrl);
        const detail = `${base}resources/${encodeURIComponent(resource.id)}/`;
        return <a className="resources-card" key={resource.id} href={detail} aria-label={`查看${resource.title}详情`}>
          <div className="resources-card-cover resource-hero-cover" style={resourceCoverStyle(resource.id)}>
            {cover ? <><CoverPixels src={cover}/><img className="resource-cover-original" src={cover} alt={`${resource.title}封面`} loading="lazy"/></> : <span>{resource.title.slice(0, 1) || "?"}</span>}
          </div>
          <div className="resources-card-copy"><div className="resources-card-meta"><span>{resource.genre || "汉化作品"}</span><span>{resource.version || "版本未填写"}</span></div><h3>{resource.title}</h3>{resource.english && <p className="resources-original">{resource.english}</p>}<p className="resources-card-summary">{resource.intro?.trim() || "暂无简介"}</p></div>
        </a>;
      })}</section> : <div className="resources-empty"><BookOpen size={28}/><h2>暂无已发布资源</h2><p>公开发布的汉化作品会展示在这里。</p></div>}
      <footer className="resources-footer"><span>THE NEW BIT</span><span>{items.length} 项公开作品</span></footer>
    </>}
  </main>;
}
