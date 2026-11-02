export function createField(width:number,height:number,random=Math.random){
 const step=Math.max(22,Math.ceil(Math.sqrt(width*height/3600)));
 return {step,columns:Math.ceil(width/step)+2,rows:Math.ceil(height/step)+2,seed:random()*Math.PI*2};
}

export function sampleField(x:number,y:number,time:number,px:number,py:number,influence:number,seed:number){
 const flow=(Math.sin(x*.006+Math.sin(y*.004-time*.14)+time*.24+seed)+Math.sin(y*.007+Math.cos(x*.003+time*.12)-time*.19+seed*.7)+Math.sin((x+y)*.003-time*.11+seed*1.3))/3;
 const value=Math.max(0,Math.min(1,(flow*.5+.5-.22)/.7));
 const cloud=value*value*(3-2*value);
 const dx=(x-px)/250,dy=(y-py)/185;
 const wake=Math.exp(-(dx*dx+dy*dy)*1.25)*(.38+.12*Math.sin(y*.012+Math.sin(x*.008+time*.2)+time*.45));
 return Math.min(1,cloud*.64+wake*influence);
}
