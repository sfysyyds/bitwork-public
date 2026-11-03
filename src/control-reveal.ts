export function installControlReveal() {
 const fine=window.matchMedia("(any-hover: hover) and (any-pointer: fine)"),motion=window.matchMedia("(prefers-reduced-motion: reduce)"),contrast=window.matchMedia("(forced-colors: active)");
 const light=document.createElement("span");light.className="control-reveal-light";light.setAttribute("aria-hidden","true");
 let host:HTMLElement|null=null,pending:PointerEvent|null=null,frame=0;
 const clear=()=>{cancelAnimationFrame(frame);frame=0;pending=null;light.removeAttribute("data-on");light.removeAttribute("data-pressed");light.remove();host?.removeAttribute("data-reveal-host");host=null;};
 const control=(target:EventTarget|null)=>{
  if(!(target instanceof Element))return null;
  const next=target.closest<HTMLElement>("button,[role=button],[role=tab],summary,a[href]");
  if(!next||next.closest(":disabled,[aria-disabled=true]"))return null;
  if(next.tagName==="A"&&getComputedStyle(next).display==="inline")return null;
  return next;
 };
 const paint=(event:PointerEvent,pressed=false)=>{
  const next=control(event.target);
  if(!next||motion.matches||contrast.matches){clear();return;}
  if(next!==host){host?.removeAttribute("data-reveal-host");host=next;host.setAttribute("data-reveal-host","");}
  if(light.parentElement!==host)host.appendChild(light);
  const rect=host.getBoundingClientRect();
  light.style.setProperty("--reveal-x",(event.clientX-rect.left)+"px");light.style.setProperty("--reveal-y",(event.clientY-rect.top)+"px");
  light.setAttribute("data-on","");light.toggleAttribute("data-pressed",pressed);
 };
 const move=(event:PointerEvent)=>{
  if(event.pointerType==="touch"||!fine.matches||motion.matches||contrast.matches)return;
  pending=event;
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;const event=pending;pending=null;if(event)paint(event,event.buttons===1);});
 };
 const down=(event:PointerEvent)=>{if(event.button!==0)return;clear();paint(event,true);};
 const up=(event:PointerEvent)=>{if(event.pointerType==="touch"||!fine.matches)clear();else light.removeAttribute("data-pressed");};
 const out=(event:PointerEvent)=>{if(host&&(!(event.relatedTarget instanceof Node)||!host.contains(event.relatedTarget)))clear();};
 document.addEventListener("pointermove",move,{passive:true});document.addEventListener("pointerdown",down,{passive:true});document.addEventListener("pointerup",up,{passive:true});document.addEventListener("pointerout",out,{passive:true});document.addEventListener("pointercancel",clear,{passive:true});
 document.addEventListener("scroll",clear,true);document.addEventListener("visibilitychange",clear);window.addEventListener("blur",clear);fine.addEventListener("change",clear);motion.addEventListener("change",clear);contrast.addEventListener("change",clear);
 return()=>{clear();document.removeEventListener("pointermove",move);document.removeEventListener("pointerdown",down);document.removeEventListener("pointerup",up);document.removeEventListener("pointerout",out);document.removeEventListener("pointercancel",clear);document.removeEventListener("scroll",clear,true);document.removeEventListener("visibilitychange",clear);window.removeEventListener("blur",clear);fine.removeEventListener("change",clear);motion.removeEventListener("change",clear);contrast.removeEventListener("change",clear);};
}
