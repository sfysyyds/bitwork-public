import { createRoot } from "react-dom/client";
import Home from "./pages/Home";
import Resources from "./pages/Resources";
import MosaicTransitions from "./components/MosaicTransitions";
import "./styles/base.css";
import "./styles/mosaic.css";

function route() {
  const base = import.meta.env.BASE_URL;
  let path = window.location.pathname;
  if (path.startsWith(base)) path = `/${path.slice(base.length)}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path === "/" || path === "") return <Home/>;
  if (path === "/resources" || path === "/resources/") return <Resources/>;
  const match = /^\/resources\/([^/]+)\/?$/.exec(path);
  if (match) {
    try { return <Resources id={decodeURIComponent(match[1])}/>; }
    catch { return <Resources id=""/>; }
  }
  return <Resources id=""/>;
}

document.title = window.location.pathname.includes("/resources") ? "汉化资源 · THE NEW BIT" : "THE NEW BIT · 汉化组工作台";
createRoot(document.getElementById("root")!).render(<><MosaicTransitions/>{route()}</>);
