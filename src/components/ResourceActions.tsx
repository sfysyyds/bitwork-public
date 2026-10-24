"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ChevronDown, ExternalLink, FileText, X } from "lucide-react";
import { currentMeasurements, downloadRoutes, downloadSpeed, externalLink, githubAsset, measureDownloads, type DownloadMeasurement } from "../resource-downloads";

export default function ResourceActions({ downloadUrl, gameUrl, articleUrl }: { downloadUrl: string; gameUrl?: string; articleUrl?: string }) {
  const direct = externalLink(downloadUrl), game = externalLink(gameUrl), article = externalLink(articleUrl);
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId(), pending = useRef<AbortController | null>(null);
  const [results, setResults] = useState<DownloadMeasurement[]>([]);
  const routes = downloadRoutes(direct), currentResults = currentMeasurements(routes, results);
  useEffect(() => { pending.current?.abort(); pending.current = null; setResults([]); return () => pending.current?.abort(); }, [direct]);
  function stop() { pending.current?.abort(); pending.current = null; }
  function close() { stop(); dialog.current?.close(); }
  async function open() {
    if (dialog.current?.open || !routes.length) return;
    dialog.current?.showModal(); setResults([]);
    const controller = new AbortController(); pending.current = controller;
    try {
      await measureDownloads(routes, controller.signal, result => setResults(old => [...old.filter(r => r.id !== result.id), result]));
    } catch { /* Closing the menu cancels the remaining samples. */ }
    finally { if (pending.current === controller) pending.current = null; controller.abort(); }
  }
  return <div className="resource-actions">
    <div className="resource-action-buttons">
      <button type="button" className="resource-download" disabled={!direct} title={direct ? "选择补丁下载线路" : "尚未填写补丁下载地址"} aria-haspopup="dialog" onClick={() => void open()}><ArrowDownToLine size={17}/>补丁下载<ChevronDown size={15}/></button>
      {game ? <a className="resource-download resource-action-secondary" href={game} target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/>游戏下载<ArrowUpRight size={14}/></a> : <button className="resource-download resource-action-secondary" disabled title="尚未填写游戏网站地址"><ExternalLink size={17}/>游戏下载</button>}
      {article ? <a className="resource-download resource-action-secondary" href={article} target="_blank" rel="noopener noreferrer"><FileText size={17}/>查看文章<ArrowUpRight size={14}/></a> : <button className="resource-download resource-action-secondary" disabled title="尚未填写文章地址"><FileText size={17}/>查看文章</button>}
    </div>
    <dialog className="patch-download-dialog" ref={dialog} aria-labelledby={titleId} onClose={stop} onClick={e => { if (e.target === dialog.current) close(); }}>
      <div className="patch-download-head"><h2 id={titleId}>补丁下载</h2><button type="button" className="patch-close" onClick={close} aria-label="关闭下载菜单" autoFocus><X size={20}/></button></div>
      <div className="patch-download-routes">{routes.map((route, index) => {
        const result = currentResults.find(r => r.id === route.id && r.url === route.url);
        return <a className="patch-download-route" key={route.id} href={route.url} rel="noreferrer" onClick={close}>
          <strong title={route.name}>{route.kind === "direct" ? "直接下载" : `代理 ${index}`}</strong>
          <span className="patch-route-speed" aria-live="polite" title={result?.status === "unavailable" ? "浏览器测速未连接成功，仍可点击尝试下载" : undefined}>{downloadSpeed(result)}</span>
        </a>;
      })}</div>
      {githubAsset(direct) && <small className="patch-download-note">代理由第三方提供</small>}
    </dialog>
  </div>;
}
