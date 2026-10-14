export function sitePath(path = "") {
  const relative = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${relative}`;
}

export function workbenchUrl(path: string) {
  const host = import.meta.env.VITE_WORKBENCH_HOST?.trim();
  if (!host) return "";
  try {
    const url = new URL(host);
    if (url.protocol !== "https:" || url.origin !== host.replace(/\/$/, "")) return "";
    return `${url.origin}${path.startsWith("/") ? path : `/${path}`}`;
  } catch {
    return "";
  }
}
