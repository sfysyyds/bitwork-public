import type { MouseEventHandler } from "react";
import { sitePath } from "../site-path";

export function Brand({ onNavigate }: { onNavigate?: MouseEventHandler<HTMLAnchorElement> }) {
  return <a className="brand" href={sitePath()} onClick={onNavigate} aria-label="THE NEW BIT 首页"><span className="brand-mark">B</span><span>THE NEW BIT</span></a>;
}
