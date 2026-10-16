"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, FileText, Zap } from "lucide-react";
import { externalLink, fastestDownload, githubAsset } from "../resource-downloads";

export default function ResourceActions({ downloadUrl, articleUrl }: { downloadUrl: string; articleUrl?: string }) {
  const direct = externalLink(downloadUrl), article = externalLink(articleUrl);
  const [busy, setBusy] = useState(false), [status, setStatus] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => { setStatus(""); setBusy(false); return () => pending.current?.abort(); }, [downloadUrl]);
  async function download() {
    if (pending.current && !pending.current.signal.aborted) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setStatus("正在测试 3 个代理节点，最多约 6 秒…");
    try {
      const result = await fastestDownload(direct, controller.signal);
      setStatus(`已选 ${result.name}（小样本测速最快），正在发起下载…`);
      window.location.assign(result.url);
    } catch (error) {
      if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : "测速失败，请使用直接下载。");
    } finally { if (!controller.signal.aborted) setBusy(false); controller.abort(); }
  }
  return <div className="resource-actions">
    <div className="resource-action-buttons">
      {direct ? <a className="resource-download" href={direct} rel="noreferrer"><ArrowDownToLine size={17}/>直接下载</a> : <button className="resource-download" disabled title="尚未填写下载地址">直接下载</button>}
      <button type="button" className="resource-download resource-action-secondary" disabled={busy || !githubAsset(direct)} onClick={() => void download()} title="点击后向第三方代理发送公开文件地址；每个节点最多读取128 KiB样本，不使用登录凭据"><Zap size={17}/>{busy ? "测速中…" : "代理下载"}</button>
      {article ? <a className="resource-download resource-action-secondary" href={article} target="_blank" rel="noopener noreferrer"><FileText size={17}/>查看文章<ArrowUpRight size={14}/></a> : <button className="resource-download resource-action-secondary" disabled title="尚未填写文章地址"><FileText size={17}/>查看文章</button>}
    </div>
    {githubAsset(direct) && <small className="resource-action-note">代理由第三方提供</small>}
    <p className="resource-action-status" role="status" aria-live="polite">{status}</p>
  </div>;
}
