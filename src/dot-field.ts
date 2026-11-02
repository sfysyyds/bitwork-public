export function createField(width:number,height:number,random= Math.random){
 const step=Math.max(22,Math.ceil(Math.sqrt(width*height/3600))),columns=Math.ceil(width/step)+2,rows=Math.ceil(height/step)+2;
 return {step,columns,rows,current:new Float32Array(columns*rows),previous:new Float32Array(columns*rows),next:new Float32Array(columns*rows),speed:Float32Array.from({length:columns*rows},()=>.18+random()*.12)};
}
export type DotField=ReturnType<typeof createField>;

export function disturbField(field:DotField,x:number,y:number,power:number){
 const {step,columns,rows,current}=field,cx=Math.round(x/step),cy=Math.round(y/step);
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
  const xx=cx+dx,yy=cy+dy;if(xx<1||yy<1||xx>=columns-1||yy>=rows-1)continue;
  const i=yy*columns+xx;current[i]=Math.max(-2,Math.min(2,current[i]+power*Math.exp(-(dx*dx+dy*dy)*.65)));
 }
}

export function advanceField(field:DotField){
 const {columns,rows,current,previous,next,speed}=field;let energy=0;
 for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
  const i=y*columns+x,lap=current[i-1]+current[i+1]+current[i-columns]+current[i+columns]-4*current[i];
  const value=(2*current[i]-previous[i]+speed[i]*lap)*.94;
  next[i]=Math.max(-2,Math.min(2,value));energy=Math.max(energy,Math.abs(next[i]));
 }
 field.previous=current;field.current=next;field.next=previous;return energy;
}
