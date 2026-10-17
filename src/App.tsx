import Home from "./pages/Home";
import Resources from "./pages/Resources";
import MosaicTransitions from "./components/MosaicTransitions";

export default function App({ pathname }: { pathname: string }) {
  const base = import.meta.env.BASE_URL;
  let path = pathname;
  if (path.startsWith(base)) path = `/${path.slice(base.length)}`;
  path = path.replace(/\/{2,}/g, "/");
  let page;
  if (path === "/" || path === "") page = <Home/>;
  else if (path === "/resources" || path === "/resources/") page = <Resources/>;
  else {
    const match = /^\/resources\/([^/]+)\/?$/.exec(path);
    let id = "";
    try { id = match ? decodeURIComponent(match[1]) : ""; } catch { /* Invalid paths show the existing not-found view. */ }
    page = <Resources id={id}/>;
  }
  return <><MosaicTransitions/>{page}</>;
}
