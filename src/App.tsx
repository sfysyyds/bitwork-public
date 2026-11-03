import Home from "./pages/Home";
import Resources from "./pages/Resources";
import PageFrame from "./components/PageFrame";
import { pageRoute } from "./page-route";

export default function App({ pathname }: { pathname: string }) {
  const route = pageRoute(pathname);
  return <PageFrame home={route.home}>{route.home ? <Home/> : <Resources id={route.id}/>}</PageFrame>;
}
