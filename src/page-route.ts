export function pageRoute(pathname: string) {
  const base = import.meta.env.BASE_URL;
  let path = pathname === base.slice(0, -1) ? "/" : pathname.startsWith(base) ? `/${pathname.slice(base.length)}` : pathname;
  path = path.replace(/\/{2,}/g, "/");
  if (path === "/" || path === "") return { home: true, id: undefined };
  if (path === "/resources" || path === "/resources/") return { home: false, id: undefined };
  const match = /^\/resources\/([^/]+)\/?$/.exec(path);
  let id = "";
  try { id = match ? decodeURIComponent(match[1]) : ""; } catch { /* Invalid paths keep the not-found view. */ }
  return { home: false, id };
}
