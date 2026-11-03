import { useReducedEffects } from "../motion-preference";
import {useEffect,useRef} from "react";
import {createField,sampleField} from "../dot-field";

export default function DotField(){
 const { reduced } = useReducedEffects();
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current!,ctx=canvas.getContext("2d");if(!ctx)return;
  const seed=Math.random();
  let width=0,height=0,field=createField(1,1,()=>seed),frame=0,last=0,time=0;
  let targetX=0,targetY=0,px=0,py=0,influence=0,inside=false;
  const animated=()=>!reduced;
  const paint=()=>{
   const scale=field.scale;ctx.clearRect(0,0,width,height);
   for(let y=1;y<field.rows-1;y++)for(let x=1;x<field.columns-1;x++){
    const xx=x*field.step,yy=y*field.step;if(xx>width||yy>height)continue;
    const strength=sampleField(xx/scale,yy/scale,animated()?time:0,px/scale,py/scale,animated()?influence:0,field.seed);
    const edge=Math.min(1,Math.min(xx,yy,width-xx,height-yy)/65),alpha=(.07+strength*.64)*(.4+.6*edge),radius=(.65+strength*1.15)*scale;
    if(strength>.55){ctx.fillStyle=`rgba(255,255,255,${(strength-.55)*.13})`;ctx.beginPath();ctx.arc(xx,yy,radius*2.5,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=`rgba(255,255,255,${alpha})`;
    ctx.beginPath();ctx.arc(xx,yy,radius,0,Math.PI*2);ctx.fill();
   }
  };
  const draw=(now:number)=>{
   frame=0;if(document.hidden||!animated())return;
   if(!last)last=now;
   if(now-last>=1000/30){
    const dt=Math.min((now-last)/1000,.05),ease=1-Math.exp(-dt*4);last=now;time+=dt;
    px+=(targetX-px)*ease;py+=(targetY-py)*ease;influence+=((inside?1:0)-influence)*ease;paint();
   }
   frame=requestAnimationFrame(draw);
  };
  const start=()=>{cancelAnimationFrame(frame);frame=0;last=0;if(document.hidden)return;if(animated())frame=requestAnimationFrame(draw);else paint();};
  const resize=()=>{
   width=window.innerWidth;height=window.innerHeight;field=createField(width,height,()=>seed);
   const dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt(5000000/(width*height)));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
   ctx.setTransform(dpr,0,0,dpr,0,0);paint();if(animated())start();
  };
  const pointer=(event:PointerEvent)=>{if(!animated())return;if(!inside&&influence<.01){px=event.clientX;py=event.clientY;}targetX=event.clientX;targetY=event.clientY;inside=true;};
  const leave=()=>{inside=false;};
  const release=(event:PointerEvent)=>{if(event.pointerType!=="mouse")leave();};
  window.addEventListener("pointerdown",pointer,{passive:true});window.addEventListener("pointermove",pointer,{passive:true});window.addEventListener("pointerup",release,{passive:true});window.addEventListener("pointercancel",leave,{passive:true});document.addEventListener("pointerleave",leave);window.addEventListener("blur",leave);window.addEventListener("resize",resize);
  document.addEventListener("visibilitychange",start);resize();
  return()=>{cancelAnimationFrame(frame);window.removeEventListener("pointerdown",pointer);window.removeEventListener("pointermove",pointer);window.removeEventListener("pointerup",release);window.removeEventListener("pointercancel",leave);document.removeEventListener("pointerleave",leave);window.removeEventListener("blur",leave);window.removeEventListener("resize",resize);document.removeEventListener("visibilitychange",start);};
 },[reduced]);
 return <canvas ref={ref} className="dot-field" aria-hidden="true"/>;
}
