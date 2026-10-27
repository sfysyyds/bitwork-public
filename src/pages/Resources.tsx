import { BookOpen } from "lucide-react";
import { Brand } from "../components/Brand";
import ResourceArticle, { CoverPixels, resourceCoverStyle, resourceMediaUrl } from "../components/ResourceArticle";
import { sitePath } from "../site-path";
import type { ResourceItem } from "../types";
import snapshot from "../data/resources.json";
import { resourceImageProps } from "../resource-images";
import "../styles/resources.css";

const items = snapshot.items as ResourceItem[];

export default function Resources({ id }: { id?: string }) {
  const isDetail = id !== undefined;
  const activeResource = id ? items.find(item => item.id === id) ?? null : null;
  const base = sitePath();
  return <main className="resources-page">
    <header className="resources-header"><Brand/><a href={isDetail ? sitePath("resources/") : sitePath()} className="resources-home">←{isDetail ? "作品目录" : "首页"}</a></header>
    {isDetail ? activeResource ? <ResourceArticle resource={activeResource}/> : <div className="resources-state"><h1>未找到这项资源</h1><p>作品不存在，或尚未公开发布。</p><a href={sitePath("resources/")} className="resources-home">←返回资源目录</a></div> : <>
      <section className="resources-intro"><h1>汉化资源</h1><p>团队齐心合力之作</p></section>
      <div className="resources-list-heading"><h2>作品目录</h2><span>{items.length} 项</span></div>
      {items.length ? <section className="resources-grid" aria-label="汉化游戏列表">{items.map((resource, index) => {
        const cover = resourceMediaUrl(resource.coverUrl);
        const detail = `${base}resources/${encodeURIComponent(resource.id)}/`;
        return <a className="resources-card" key={resource.id} href={detail} aria-label={`查看${resource.title}${resource.english ? `（${resource.english}）` : ""}汉化补丁`}>
          <div className="resources-card-cover resource-hero-cover" style={resourceCoverStyle(resource.id)}>
            {cover ? <><CoverPixels src={resource.coverUrl} sizes="(max-width: 600px) calc(100vw - 40px), (max-width: 900px) 40vw, 280px"/><img className="resource-cover-original" {...resourceImageProps(resource.coverUrl, "(max-width: 600px) calc(100vw - 40px), (max-width: 900px) 40vw, 280px")} alt={`${resource.title}封面`} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"}/></> : <span>{resource.title.slice(0, 1) || "?"}</span>}
          </div>
          <div className="resources-card-copy"><div className="resources-card-meta"><span>{resource.genre || "汉化作品"}</span><span>{resource.version || "版本未填写"}</span></div><h3>{resource.title}</h3>{resource.english && <p className="resources-original">{resource.english} 汉化补丁</p>}<p className="resources-card-summary">{resource.intro?.trim() || "暂无简介"}</p></div>
        </a>;
      })}</section> : <div className="resources-empty"><BookOpen size={28}/><h2>暂无已发布资源</h2><p>公开发布的汉化作品会展示在这里。</p></div>}
      <footer className="resources-footer"><span>新位元汉化组 · THE NEW BIT</span><span>{items.length} 项公开作品</span></footer>
    </>}
  </main>;
}
