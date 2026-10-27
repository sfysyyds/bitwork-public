import { ArrowDownRight, ArrowUpRight, BookOpen, LogIn } from "lucide-react";
import { Brand } from "../components/Brand";
import BitScene from "../components/BitScene";
import { sitePath, workbenchUrl } from "../site-path";
import CommunityCodes from "../components/CommunityCodes";
import snapshot from "../data/resources.json";
import "../styles/homepage.css";
import "../styles/community-codes.css";

const updatedAt = __SITE_UPDATED_AT__;
const updatedLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hourCycle: "h23" }).format(new Date(updatedAt));

export default function Home() {
  const login = workbenchUrl("/login");
  return <main className="landing archive-home">
    <div className="bit-field" aria-hidden="true" />
    <header className="landing-header"><Brand/><nav aria-label="主导航"><a href={sitePath("resources/")}>作品档案 <ArrowUpRight size={14}/></a><a href={login || undefined} aria-disabled={!login}>翻译工作台 <ArrowUpRight size={14}/></a></nav></header>
    <section className="archive-hero" aria-labelledby="archive-title">
      <div className="archive-hero-copy">
        <p className="archive-eyebrow"><span className="archive-square" aria-hidden="true"/>独立汉化 · 新位元汉化组</p>
        <h1 id="archive-title">THE NEW<br/><span>BIT<span className="archive-title-dot" aria-hidden="true">_</span></span><span className="sr-only"> 新位元汉化组</span></h1>
        <div className="archive-manifest"><span aria-hidden="true">//</span><p>文字之间，<br className="archive-mobile-break"/>连接世界。</p></div>
        <p className="archive-hero-note">团队齐心合力之作。</p>
      </div>
      <figure className="archive-glyph"><figcaption><span>GLYPH / B_01</span><span aria-hidden="true">[ + ]</span></figcaption><BitScene/><div className="archive-glyph-footer"><span>PIXEL / MONOCHROME</span><ArrowDownRight size={20} aria-hidden="true"/></div></figure>
    </section>
    <section className="archive-portals" aria-label="站点入口">
      <a className="archive-portal archive-portal-primary" href={sitePath("resources/")}><span className="archive-portal-number">01 / ARCHIVE</span><span className="archive-portal-main"><BookOpen size={22}/><strong>探索汉化作品</strong><ArrowUpRight className="archive-portal-arrow" size={25}/></span><span className="archive-portal-caption">作品介绍、版本更新与补丁下载 <span>{String(snapshot.items.length).padStart(2,"0")} 项已发布</span></span></a>
      <a className="archive-portal" href={login || undefined} aria-disabled={!login}><span className="archive-portal-number">02 / WORKSPACE</span><span className="archive-portal-main"><LogIn size={22}/><strong>进入翻译工作台</strong><ArrowUpRight className="archive-portal-arrow" size={25}/></span><span className="archive-portal-caption">翻译、审校与协作 <span>成员入口</span></span></a>
    </section>
    <footer className="landing-footer"><div className="landing-release"><span>THE NEW BIT <span aria-hidden="true">/</span> 新位元</span><time dateTime={updatedAt}>更新于 {updatedLabel}</time></div><CommunityCodes/></footer>
  </main>;
}
