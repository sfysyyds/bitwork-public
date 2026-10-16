// Maintained public services, not an exhaustive or trusted mirror network.
// Sources: https://ghproxy.net/ https://ghproxy.link/ https://gh-proxy.com/
export const downloadProxies = [
  { name: "GHProxy", origin: "https://ghproxy.net/" },
  { name: "GHFast", origin: "https://ghfast.top/" },
  { name: "GH-Proxy", origin: "https://gh-proxy.com/" },
] as const;
const sampleBytes = 128 * 1024;

export function externalLink(value?: string) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}

export function githubAsset(value: string) {
  try {
    const url = new URL(externalLink(value));
    return url.origin === "https://github.com" && !url.search && !url.hash && /^\/[^/]+\/[^/]+\/releases\/(?:download\/[^/]+|latest\/download)\/[^/]+$/.test(url.pathname) ? url.href : "";
  } catch { return ""; }
}

export async function fastestDownload(value: string, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  const asset = githubAsset(value);
  if (!asset) throw new Error("代理下载仅支持不含凭据、参数的公开 GitHub Release 文件直链。");
  const results = await Promise.all(downloadProxies.map(async proxy => {
    const controller = new AbortController(), abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, 6000), start = performance.now();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      if (signal.aborted) return null;
      const url = proxy.origin + asset;
      const response = await fetcher(url, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", headers: { Range: `bytes=0-${sampleBytes - 1}` } });
      const range = /^bytes 0-(\d+)\/(\d+)$/.exec(response.headers.get("content-range") || "");
      if (response.status !== 206 || !range || Number(range[1]) >= sampleBytes || Number(range[2]) <= Number(range[1]) || /(?:text\/|html|json)/i.test(response.headers.get("content-type") || "") || !response.body) {
        await response.body?.cancel(); return null;
      }
      reader = response.body.getReader();
      let bytes = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > sampleBytes) return null;
      }
      if (!bytes || bytes !== Number(range[1]) + 1) return null;
      return { name: proxy.name, url, bytes, ms: Math.max(1, performance.now() - start) };
    } catch { return null; }
    finally { clearTimeout(timer); signal.removeEventListener("abort", abort); await reader?.cancel().catch(() => {}); controller.abort(); }
  }));
  if (signal.aborted) throw new DOMException("已取消测速", "AbortError");
  // A small sample measures this visitor's current route, not sustained full-file speed.
  const best = results.filter(result => result !== null).sort((a, b) => b.bytes / b.ms - a.bytes / a.ms)[0];
  if (!best) throw new Error("暂无可验证的代理节点（可能超时、跨域受限或不支持分段下载），请使用直接下载。");
  return best;
}
