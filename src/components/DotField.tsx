import {useEffect,useRef} from "react";
import {advanceField,createField,disturbField} from "../dot-field";

export default function DotField(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current!,ctx=canvas.getContext("2d");if(!ctx)return;
  const motion=matchMedia("(prefers-reduced-motion: reduce)"),mouse=matchMedia("(hover: hover) and (pointer: fine)");
  let width=0,height=0,field=createField(1,1),frame=0,last=0,lastImpulse=0,energy=0;
  const animated=()=>!motion.matches&&mouse.matches;
  const paint=()=>{
   ctx.clearRect(0,0,width,height);
   for(let y=1;y<field.rows-1;y++)for(let x=1;x<field.columns-1;x++){
    const px=x*field.step,py=y*field.step;if(px>width||py>height)continue;
    const strength=animated()?Math.min(1,Math.abs(field.current[y*field.columns+x])*.85):0;
    const edge=Math.min(1,Math.min(px,py,width-px,height-py)/65);
    ctx.fillStyle=`rgba(230,234,242,${(.09+strength*.49)*(.4+.6*edge)})`;
    ctx.beginPath();ctx.arc(px,py,.7+strength*1.65,0,Math.PI*2);ctx.fill();
   }
  };
  const draw=(time:number)=>{
   frame=0;if(document.hidden||!animated())return;
   if(time-last>=1000/30){
    last=time;
    energy=advanceField(field);paint();
   }
   if(energy>.015)frame=requestAnimationFrame(draw);
  };
  const start=()=>{
   cancelAnimationFrame(frame);frame=0;
   if(document.hidden)return;
   if(animated()&&energy>.015)frame=requestAnimationFrame(draw);else paint();
  };
  const resize=()=>{
   width=window.innerWidth;height=window.innerHeight;field=createField(width,height);
   const dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(5000000/(width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
   ctx.setTransform(dpr,0,0,dpr,0,0);energy=0;last=0;paint();start();
  };
  const pointer=(event:PointerEvent)=>{
   if(event.pointerType!=="mouse"||document.hidden||!animated())return;
   const now=performance.now();if(now-lastImpulse<65)return;lastImpulse=now;
   // Vary the excitation and local wave speed, not the fixed dot positions.
   disturbField(field,event.clientX+(Math.random()-.5)*34,event.clientY+(Math.random()-.5)*34,.8+Math.random()*.7);
   energy=1;start();
  };
  window.addEventListener("pointermove",pointer,{passive:true});window.addEventListener("resize",resize);
  document.addEventListener("visibilitychange",start);motion.addEventListener("change",start);mouse.addEventListener("change",start);resize();
  return()=>{cancelAnimationFrame(frame);window.removeEventListener("pointermove",pointer);window.removeEventListener("resize",resize);document.removeEventListener("visibilitychange",start);motion.removeEventListener("change",start);mouse.removeEventListener("change",start);};
 },[]);
 return <canvas ref={ref} className="dot-field" aria-hidden="true"/>;
}
