import type { MouseEventHandler } from "react";
import { sitePath } from "../site-path";
import { glyph } from "./BitScene";

export function Brand({ onNavigate }: { onNavigate?: MouseEventHandler<HTMLAnchorElement> }) {
  return <a className="brand" href={sitePath()} onClick={onNavigate} aria-label="THE NEW BIT 首页"><svg className="brand-mark" viewBox="0 0 9 13" aria-hidden="true">{glyph.flatMap((row,y)=>[...row].flatMap((cell,x)=>cell==="1"?<rect key={`${x}-${y}`} x={x} y={y} width={.8} height={.8}/>:[]))}</svg><span>THE NEW BIT</span></a>;
}
