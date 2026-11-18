import { workbenchUrl } from "./site-path";

export type AnalyticsPageType = "home" | "catalog" | "resource";
export type AnalyticsDownloadEvent = "patch_download" | "game_download";
export type AnalyticsRouteKind = "direct" | "proxy";

type AnalyticsHitParams = {
  event: "view" | AnalyticsDownloadEvent;
  page: AnalyticsPageType;
  resource?: string;
  route?: AnalyticsRouteKind;
};

const HIT_COOLDOWN_MS = 2000;
const BEACON_CLEANUP_MS = 8000;
const recentHits = new Map<string, number>();
const pendingBeacons = new Set<HTMLImageElement>();

function isPrerenderingDocument(): boolean {
  if (typeof document === "undefined") return false;
  const doc = document as Document & { prerendering?: boolean };
  return (
    doc.prerendering === true ||
    document.visibilityState === ("prerender" as DocumentVisibilityState)
  );
}

function hitKey(params: AnalyticsHitParams): string {
  return `${params.event}|${params.page}|${params.resource ?? ""}|${params.route ?? ""}`;
}

function sendBeaconPixel(params: AnalyticsHitParams): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const endpoint = workbenchUrl("/api/site-metrics/hit");
  if (!endpoint) return;

  const key = hitKey(params);
  const now = Date.now();
  const prev = recentHits.get(key) ?? 0;
  if (now - prev < HIT_COOLDOWN_MS) return;
  recentHits.set(key, now);

  if (recentHits.size > 128) {
    for (const [k, ts] of recentHits) {
      if (now - ts >= HIT_COOLDOWN_MS * 5) recentHits.delete(k);
    }
  }

  const query = new URLSearchParams({
    event: params.event,
    page: params.page,
    v: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  });
  if (params.resource) query.set("resource", params.resource);
  if (params.route) query.set("route", params.route);

  const url = `${endpoint}?${query.toString()}`;
  const img = new window.Image();
  pendingBeacons.add(img);

  let timer: number | null = null;
  const cleanup = () => {
    pendingBeacons.delete(img);
    img.onload = null;
    img.onerror = null;
    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };

  timer = window.setTimeout(cleanup, BEACON_CLEANUP_MS);

  img.onload = cleanup;
  img.onerror = cleanup;
  img.decoding = "async";
  img.referrerPolicy = "strict-origin-when-cross-origin";
  img.src = url;
}

export function trackPublicView(
  page: AnalyticsPageType,
  resourceId?: string,
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }
  if (page === "resource" && !resourceId) {
    return () => {};
  }

  const dispatch = () =>
    sendBeaconPixel({
      event: "view",
      page,
      ...(resourceId ? { resource: resourceId } : {}),
    });

  if (!isPrerenderingDocument()) {
    dispatch();
    return () => {};
  }

  const onActivate = () => {
    if (!isPrerenderingDocument()) dispatch();
  };
  document.addEventListener("prerenderingchange", onActivate, { once: true });
  return () => {
    document.removeEventListener("prerenderingchange", onActivate);
  };
}

export function trackPublicDownload(
  event: AnalyticsDownloadEvent,
  resourceId: string,
  route?: AnalyticsRouteKind,
): void {
  if (!resourceId || isPrerenderingDocument()) return;
  sendBeaconPixel({
    event,
    page: "resource",
    resource: resourceId,
    ...(event === "patch_download" && route ? { route } : {}),
  });
}

export function resetSiteAnalyticsCooldownForTests(): void {
  recentHits.clear();
  pendingBeacons.clear();
}
