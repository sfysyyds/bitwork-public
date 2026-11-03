// Public, third-party services. Browser-side samples only; no credentials are forwarded.
// Existing providers: https://ghproxy.net/ https://ghproxy.link/ https://gh-proxy.com/
// Additional providers listed by https://github.com/NapNeko/NapCat-Installer/blob/main/script/install.sh
// Availability is never guaranteed; only successful CORS/Range samples are ranked.
export const downloadProxies = [
  { name: "GHProxy", origin: "https://ghproxy.net/" },
  { name: "GHFast", origin: "https://ghfast.top/" },
  { name: "GH-Proxy", origin: "https://gh-proxy.com/" },
  { name: "Imciel", origin: "https://ghproxy.imciel.com/" },
  { name: "ACMSZ", origin: "https://gh.acmsz.top/" },
  { name: "Monlor", origin: "https://gh.monlor.com/" },
] as const;
export const downloadSampleBytes = 128 * 1024;
export type DownloadRoute = { id: string; name: string; url: string; kind: "direct" | "proxy" };
export type DownloadMeasurement = DownloadRoute & (
  | { status: "ok"; bytes: number; ms: number }
  | { status: "unmeasurable" | "timeout"; message: string }
  | { status: "http-error"; statusCode: number; message: string }
);

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
export function downloadRoutes(value: string): DownloadRoute[] {
  const direct = externalLink(value), asset = githubAsset(value);
  return direct ? [{ id: "direct", name: "直接下载", url: direct, kind: "direct" }, ...(asset ? downloadProxies.map(p => ({ id: p.origin, name: p.name, url: p.origin + asset, kind: "proxy" as const })) : [])] : [];
}
export function downloadSpeed(result: DownloadMeasurement | undefined) {
  if (!result) return "尚未测速";
  if (result.status !== "ok") return result.message;
  const kib = result.bytes * 1000 / result.ms / 1024;
  return kib >= 1024 ? `${(kib / 1024).toFixed(2)} MiB/s` : `${kib.toFixed(1)} KiB/s`;
}
export function currentMeasurements(routes: DownloadRoute[], results: DownloadMeasurement[]) {
  return results.filter(r => routes.some(route => route.id === r.id && route.url === r.url));
}
export function fastestMeasured(results: DownloadMeasurement[]) {
  return results.filter((r): r is DownloadMeasurement & { status: "ok"; bytes: number; ms: number } => r.status === "ok").sort((a, b) => b.bytes / b.ms - a.bytes / a.ms)[0];
}
async function probe(route: DownloadRoute, signal: AbortSignal, fetcher: typeof fetch): Promise<DownloadMeasurement> {
  const controller = new AbortController(), abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; abort(); }, 6000), start = performance.now();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const unmeasurable = (message: string): DownloadMeasurement => ({ ...route, status: "unmeasurable", message });
  try {
    if (signal.aborted) throw new DOMException("已取消测速", "AbortError");
    const response = await fetcher(route.url, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", headers: { Range: `bytes=0-${downloadSampleBytes - 1}` } });
    if (response.status >= 400) {
      await response.body?.cancel();
      return { ...route, status: "http-error", statusCode: response.status, message: `HTTP ${response.status}：仍可尝试下载` };
    }
    const range = /^bytes 0-(\d+)\/(\d+)$/.exec(response.headers.get("content-range") || "");
    if (response.status !== 206 || !range || !Number.isSafeInteger(Number(range[1])) || Number(range[1]) >= downloadSampleBytes || !Number.isSafeInteger(Number(range[2])) || Number(range[2]) <= Number(range[1]) || /(?:text\/|html|json)/i.test(response.headers.get("content-type") || "") || !response.body) {
      await response.body?.cancel();
      return unmeasurable(response.status === 200 ? "HTTP 200：服务器未提供可读取的分段响应；仍可尝试下载" : `HTTP ${response.status}：无法测量分段速度；仍可尝试下载`);
    }
    reader = response.body.getReader();
    let bytes = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > downloadSampleBytes) return unmeasurable("响应超过样本上限，已停止测速；仍可尝试下载");
    }
    if (!bytes || bytes !== Number(range[1]) + 1) return unmeasurable("测速样本不完整；仍可尝试下载");
    return { ...route, status: "ok", bytes, ms: Math.max(1, performance.now() - start) };
  } catch {
    if (signal.aborted) throw new DOMException("已取消测速", "AbortError");
    return timedOut
      ? { ...route, status: "timeout", message: "测速超时；仍可尝试下载" }
      : unmeasurable("浏览器无法读取线路响应（可能由跨域或网络限制）；仍可尝试下载");
  } finally {
    clearTimeout(timer); signal.removeEventListener("abort", abort);
    await reader?.cancel().catch(() => {}); controller.abort();
  }
}
export async function measureDownloads(routes: DownloadRoute[], signal: AbortSignal, onResult: (result: DownloadMeasurement) => void = () => {}, fetcher: typeof fetch = fetch) {
  if (signal.aborted) throw new DOMException("已取消测速", "AbortError");
  const results: DownloadMeasurement[] = new Array(routes.length);
  let index = 0;
  // At most three short samples in flight; never download a full patch for measurement.
  async function worker() {
    while (!signal.aborted) {
      const at = index++; if (at >= routes.length) return;
      const result = await probe(routes[at], signal, fetcher);
      if (signal.aborted) return;
      results[at] = result; onResult(result);
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, routes.length) }, worker));
  if (signal.aborted) throw new DOMException("已取消测速", "AbortError");
  return results;
}
export async function fastestDownload(value: string, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  if (!githubAsset(value)) throw new Error("代理下载仅支持不含凭据、参数的公开 GitHub Release 文件直链。");
  const best = fastestMeasured(await measureDownloads(downloadRoutes(value).filter(r => r.kind === "proxy"), signal, undefined, fetcher));
  if (!best) throw new Error("暂无可验证的代理节点，请使用直接下载。");
  return best;
}
