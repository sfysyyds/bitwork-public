"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ChevronDown, ExternalLink, FileText, X } from "lucide-react";
import { currentMeasurements, downloadRoutes, downloadSpeed, externalLink, githubAsset, measureDownloads, type DownloadMeasurement } from "../resource-downloads";

export default function ResourceActions({ downloadUrl, gameUrl, articleUrl }: { downloadUrl: string; gameUrl?: string; articleUrl?: string }) {
  const direct = externalLink(downloadUrl), game = externalLink(gameUrl), article = externalLink(articleUrl);
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId(), pending = useRef<AbortController | null>(null);
  const [results, setResults] = useState<DownloadMeasurement[]>([]);
  const [measuring, setMeasuring] = useState(false), [measurementMessage, setMeasurementMessage] = useState("测速仅测量浏览器可读取的分段响应，不验证文件完整性；无法测速时仍可尝试下载。");
  const lastMeasuredAt = useRef(0);
  const routes = downloadRoutes(direct), currentResults = currentMeasurements(routes, results);
  useEffect(() => { dialog.current?.close(); pending.current?.abort(); pending.current = null; setMeasuring(false); setResults([]); lastMeasuredAt.current = 0; return () => pending.current?.abort(); }, [direct]);
  function stop() {
    const controller = pending.current;
    pending.current = null;
    controller?.abort();
    if (controller) { setMeasuring(false); setMeasurementMessage("测速已取消；仍可尝试下载。"); }
  }
  function close() { stop(); dialog.current?.close(); }
  function open() {
    if (dialog.current?.open || !routes.length) return;
    dialog.current?.showModal();
  }
  async function testRoutes() {
    if (pending.current || !routes.length) return;
    if (Date.now() - lastMeasuredAt.current < 30_000) {
      setMeasurementMessage("正在复用最近 30 秒内的测速结果；仍可直接下载。");
      return;
    }
    setResults([]);
    const controller = new AbortController(); pending.current = controller;
    setMeasuring(true); setMeasurementMessage("正在测速（每条线路最多等待 6 秒）…");
    try {
      await measureDownloads(routes, controller.signal, result => setResults(old => [...old.filter(r => r.id !== result.id), result]));
      if (!controller.signal.aborted) {
        lastMeasuredAt.current = Date.now();
        setMeasurementMessage("测速完成。无法测量不代表下载不可用；结果不会验证文件完整性。");
      }
    } catch {
      if (!controller.signal.aborted) setMeasurementMessage("测速未完成；仍可直接下载。");
    } finally {
      if (pending.current === controller) { pending.current = null; setMeasuring(false); }
      controller.abort();
    }
  }
  return <div className="resource-actions">
    <div className="resource-action-buttons">
      {direct ? <a className="resource-download" href={direct} title="选择补丁下载线路" aria-haspopup="dialog" onClick={event => { event.preventDefault(); void open(); }}><ArrowDownToLine size={17}/>补丁下载<ChevronDown size={15}/></a> : <button type="button" className="resource-download" disabled title="尚未填写补丁下载地址" aria-haspopup="dialog"><ArrowDownToLine size={17}/>补丁下载<ChevronDown size={15}/></button>}
      {game ? <a className="resource-download resource-action-secondary" href={game} target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/>游戏下载<ArrowUpRight size={14}/></a> : <button className="resource-download resource-action-secondary" disabled title="尚未填写游戏网站地址"><ExternalLink size={17}/>游戏下载</button>}
      {article ? <a className="resource-download resource-action-secondary" href={article} target="_blank" rel="noopener noreferrer"><FileText size={17}/>查看文章<ArrowUpRight size={14}/></a> : <button className="resource-download resource-action-secondary" disabled title="尚未填写文章地址"><FileText size={17}/>查看文章</button>}
    </div>
    <dialog className="patch-download-dialog" ref={dialog} aria-labelledby={titleId} onClose={stop} onClick={e => { if (e.target === dialog.current) close(); }}>
      <div className="patch-download-head"><h2 id={titleId}>补丁下载</h2><button type="button" className="patch-close" onClick={close} aria-label="关闭下载菜单" autoFocus><X size={20}/></button></div>
      <p className="patch-download-status">测速为可选操作。{measurementMessage}</p>
      <button className="patch-speedtest" type="button" onClick={() => void testRoutes()} disabled={measuring}>{measuring ? "测速中…" : lastMeasuredAt.current && Date.now() - lastMeasuredAt.current < 30_000 ? "测速结果已缓存" : "测速线路"}</button>
      <div className="patch-download-routes">{routes.map(route => {
        const result = currentResults.find(r => r.id === route.id && r.url === route.url);
        return <a className="patch-download-route" key={route.id} href={route.url} rel="noreferrer" onClick={close}>
          <span className="patch-route-label"><strong title={route.name}>{route.name}</strong><small>{new URL(route.url).hostname}</small></span>
          <span className="patch-route-speed" aria-live="polite">{downloadSpeed(result)}</span>
        </a>;
      })}</div>
      {githubAsset(direct) && <small className="patch-download-note">代理为第三方服务，域名已在各线路中标出。</small>}
    </dialog>
  </div>;
}
