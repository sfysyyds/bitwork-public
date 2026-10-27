"use client";
import {useEffect,useRef} from "react";

export default function BitScene(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current!,ctx=canvas.getContext("2d");if(!ctx)return;
  const landing=canvas.closest<HTMLElement>(".landing")!,motion=matchMedia("(prefers-reduced-motion: reduce)");
  const mask=document.createElement("canvas");mask.width=320;mask.height=360;
  const m=mask.getContext("2d")!;m.font="900 360px Arial";m.textAlign="center";m.fillText("B",160,309);
  const pixels=m.getImageData(0,0,320,360).data,points:{x:number;y:number}[]=[];
  for(let y=8;y<348;y+=7)for(let x=8;x<312;x+=7)if(pixels[(y*320+x)*4+3]>100)points.push({x,y});
  let frame=0,last=0,visible=false;
  const draw=(time:number)=>{
   if(!visible||document.hidden)return;
   if(time-last>32||motion.matches){
    last=time;const size=canvas.clientWidth,dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(size*dpr)){canvas.width=Math.round(size*dpr);canvas.height=Math.round(size*360/320*dpr);}
    ctx.setTransform(canvas.width/320,0,0,canvas.width/320,0,0);ctx.clearRect(0,0,320,360);
    const t=motion.matches?0:time/1000;
    for(const p of points){
     const x=p.x,y=p.y;
     const phase=motion.matches?0:((t*.7-(p.x+p.y*.55)/60)%3+3)%3;
     const shape=Math.floor(phase),fraction=phase-shape,mix=fraction*fraction*(3-2*fraction);
     const paint=(form:number,alpha:number)=>{if(alpha===0)return;ctx.fillStyle=`rgba(255,255,255,${alpha*.9})`;ctx.beginPath();
      if(form===0)ctx.rect(x-2,y-2,4,4);
      else if(form===1)ctx.arc(x,y,2.2,0,Math.PI*2);
      else { // triangle
      ctx.moveTo(x,y-2.6);ctx.lineTo(x+2.4,y+2);ctx.lineTo(x-2.4,y+2);ctx.closePath();
      }ctx.fill();
     };
     paint(shape,1-mix);paint((shape+1)%3,mix);
    }
   }
   if(!motion.matches)frame=requestAnimationFrame(draw);
  };
  const start=()=>{cancelAnimationFrame(frame);if(visible&&!document.hidden)frame=requestAnimationFrame(draw);};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;start();});observer.observe(canvas);
  const pointer=(e:PointerEvent)=>{if(e.pointerType!=="mouse")return;const r=landing.getBoundingClientRect();landing.style.setProperty("--pointer-x",`${e.clientX-r.left}px`);landing.style.setProperty("--pointer-y",`${e.clientY-r.top}px`);landing.style.setProperty("--pointer-glow","1");};
  const leave=()=>landing.style.setProperty("--pointer-glow","0");
  landing.addEventListener("pointermove",pointer);landing.addEventListener("pointerleave",leave);document.addEventListener("visibilitychange",start);motion.addEventListener("change",start);window.addEventListener("resize",start);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();landing.removeEventListener("pointermove",pointer);landing.removeEventListener("pointerleave",leave);document.removeEventListener("visibilitychange",start);motion.removeEventListener("change",start);window.removeEventListener("resize",start);};
 },[]);
 return <canvas ref={ref} className="bit-scene" width={320} height={360} role="img" aria-label="THE NEW BIT，流动几何点阵 B"/>;
}
