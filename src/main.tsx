import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import "./styles/mosaic.css";

const root = document.getElementById("root")!;
const app = <App pathname={window.location.pathname}/>;
if (root.dataset.prerendered === "true") hydrateRoot(root, app);
else createRoot(root).render(app);
