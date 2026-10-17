import { renderToString } from "react-dom/server";
import App from "./App";

export function renderPath(pathname: string) {
  return renderToString(<App pathname={pathname}/>);
}
