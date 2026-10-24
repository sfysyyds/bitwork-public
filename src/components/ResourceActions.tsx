"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ChevronDown, ExternalLink, FileText, RefreshCw, X, Zap } from "lucide-react";
import { currentMeasurements, downloadRoutes, downloadSpeed, externalLink, fastestMeasured, githubAsset, measureDownloads, type DownloadMeasurement } from "../resource-downloads";

export default function ResourceActions({ downloadUrl, gameUrl, articleUrl }: { downloadUrl: string; gameUrl?: string; articleUrl?: string }) {
  const direct = externalLink(downloadUrl), game = externalLink(gameUrl), article = externalLink(articleUrl);
  const dialog = useRef<HTMLDialogElement>(null), titleId = useId(), pending = useRef<AbortController | null>(null), measuredUrl = useRef("");
  const [results, setResults] = useState<DownloadMeasurement[]>([]), [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const routes = downloadRoutes(direct), currentResults = currentMeasurements(routes, results), best = fastestMeasured(currentResults);
  useEffect(() => { pending.current?.abort(); pending.current = null; measuredUrl.current = ""; setResults([]); setBusy(false); setStatus(""); return () => pending.current?.abort(); }, [direct]);
  function stop() { pending.current?.abort(); pending.current = null; setBusy(false); }
  function close() { stop(); dialog.current?.close(); }
  async function test() {
    if (pending.current || !routes.length) return;
    const controller = new AbortController(); pending.current = controller;
    setResults([]); setBusy(true); setStatus("正在用小样本测速，结果会逐条显示…");
    try {
      await measureDownloads(routes, controller.signal, result => setResults(old => [...old.filter(r => r.id !== result.id), result]));
      if (!controller.signal.aborted) { measuredUrl.current = direct; setStatus("测速完成。选择一条线路下载，或使用本次最快线路。"); }
    } catch { if (!controller.signal.aborted) setStatus("测速未完成，仍可直接下载。"); }
    finally { if (pending.current === controller) { pending.current = null; setBusy(false); } controller.abort(); }
  }
  function open() {
    if (!dialog.current?.open) dialog.current?.showModal();
    if (measuredUrl.current !== direct) void test();
  }
  return <div className="resource-actions">
    <div className="resource-action-buttons">
      <button type="button" className="resource-download" disabled={!direct} title={direct ? "选择补丁下载线路" : "尚未填写补丁下载地址"} aria-haspopup="dialog" onClick={open}><ArrowDownToLine size={17}/>补丁下载<ChevronDown size={15}/></button>
      {game ? <a className="resource-download resource-action-secondary" href={game} target="_blank" rel="noopener noreferrer"><ExternalLink size={17}/>游戏下载<ArrowUpRight size={14}/></a> : <button className="resource-download resource-action-secondary" disabled title="尚未填写游戏网站地址"><ExternalLink size={17}/>游戏下载</button>}
      {article ? <a className="resource-download resource-action-secondary" href={article} target="_blank" rel="noopener noreferrer"><FileText size={17}/>查看文章<ArrowUpRight size={14}/></a> : <button className="resource-download resource-action-secondary" disabled title="尚未填写文章地址"><FileText size={17}/>查看文章</button>}
    </div>
    <dialog className="patch-download-dialog" ref={dialog} aria-labelledby={titleId} onClose={stop} onClick={e => { if (e.target === dialog.current) close(); }}>
      <div className="patch-download-head"><div><h2 id={titleId}>补丁下载</h2><p>选择下载线路 · 速度仅代表本次小样本测试</p></div><button type="button" className="patch-close" onClick={close} aria-label="关闭下载菜单" autoFocus><X size={20}/></button></div>
      <div className="patch-download-routes">{routes.map(route => {
        const result = currentResults.find(r => r.id === route.id && r.url === route.url);
        return <div className="patch-download-route" key={route.id}>
          <div><strong>{route.kind === "direct" ? "直接下载" : `${route.name} · 代理下载`}</strong>{best?.id === route.id && <span className="patch-fastest">本次最快</span>}
            <span className="patch-route-speed">{result ? downloadSpeed(result) : busy ? "等待测速…" : "未测速"}</span>
            {result?.status === "unavailable" && <small>{result.message}</small>}
          </div><a className="patch-route-link" href={route.url} rel="noreferrer" onClick={close}>下载<ArrowDownToLine size={15}/></a>
        </div>;
      })}</div>
      <p className="patch-download-status" role="status" aria-live="polite">{status}</p>
      <div className="patch-download-tools"><button type="button" className="patch-route-link" disabled={busy || !best} onClick={() => { if (best && routes.some(route => route.id === best.id && route.url === best.url)) { window.location.assign(best.url); close(); } }}><Zap size={16}/>使用最快线路</button><button type="button" className="patch-retest" disabled={busy} onClick={() => void test()}><RefreshCw size={15}/>重新测速</button></div>
      <small className="patch-download-note">{githubAsset(direct) ? "代理由第三方提供。" : "此地址不支持 GitHub 代理，仍可直接下载。"}仅打开此菜单后测速，每条线路请求 128 KiB 样本；无法测速不等于无法下载。</small>
    </dialog>
  </div>;
}
