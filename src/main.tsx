import { createRoot, hydrateRoot } from "react-dom/client";
import PageFrame from "./components/PageFrame";
import { pageRoute } from "./page-route";
import "./styles/base.css";
import "./styles/mosaic.css";
import "./styles/control-reveal.css";

async function start() {
  const route = pageRoute(window.location.pathname);
  const { default: Page } = route.home ? await import("./pages/Home") : await import("./pages/Resources");
  const root = document.getElementById("root")!;
  const app = <PageFrame home={route.home}><Page id={route.id}/></PageFrame>;
  if (root.dataset.prerendered === "true") hydrateRoot(root, app);
  else createRoot(root).render(app);
}
void start();
