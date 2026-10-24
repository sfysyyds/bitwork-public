import { BookOpen, LogIn } from "lucide-react";
import { Brand } from "../components/Brand";
import BitScene from "../components/BitScene";
import PixelText from "../components/PixelText";
import { sitePath, workbenchUrl } from "../site-path";
import CommunityCodes from "../components/CommunityCodes";
import snapshot from "../data/resources.json";
import "../styles/homepage.css";
import "../styles/community-codes.css";

const updatedAt = __SITE_UPDATED_AT__;
const updatedLabel = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(updatedAt));

export default function Home() {
  const login = workbenchUrl("/login");
  return <main className="landing">
    <h1 className="sr-only">新位元汉化组 THE NEW BIT</h1>
    <div className="bit-field" aria-hidden="true" />
    <header className="landing-header"><Brand /></header>
    <section className="mobile-home"><Brand/><div className="mobile-home-intro"><BitScene/><div className="mobile-home-title"><PixelText text="THE NEW BIT" interactive className="landing-title"/></div><p>新位元汉化组</p></div><div className="mobile-home-actions"><a href={login || undefined} aria-disabled={!login}><span><strong>账号登录</strong><small>翻译工作台</small></span><LogIn size={24}/></a><a href={sitePath("resources/")}><span><strong>汉化资源</strong><small>作品发布</small></span><BookOpen size={23}/></a></div></section>
    <section className="landing-core">
      <span className="eyebrow">文字之间，连接世界</span>
      <BitScene/>
      <p><PixelText text="THE NEW BIT" interactive className="landing-title"/></p><p className="landing-subtitle">新位元汉化组</p>
      <div className="landing-actions">
        <a className="button secondary" href={sitePath("resources/")}><BookOpen size={19} />汉化资源</a>
        <a className="button primary" href={login || undefined} aria-disabled={!login}><LogIn size={19} />账号登录</a>
      </div>
    </section>
    {snapshot.items.length > 0 && <nav className="landing-projects" aria-label="已发布汉化补丁">{snapshot.items.map(item => <a key={item.id} href={sitePath(`resources/${item.id}/`)}>{item.english || item.title} 汉化补丁</a>)}</nav>}
    <footer className="landing-footer"><div className="landing-release"><span>更新时间</span><time dateTime={updatedAt}>{updatedLabel}</time></div><CommunityCodes/></footer>
  </main>;
}
