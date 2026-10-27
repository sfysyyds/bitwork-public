export const glyph = ["111111100","111111110","110000011","110000011","110000011","111111110","111111100","110000011","110000011","110000011","110000011","111111110","111111100"];

/** Static SVG: the brand renders before hydration and needs no animation loop. */
export default function BitScene() {
  return <svg className="bit-scene" viewBox="0 0 280 320" role="img" aria-label="THE NEW BIT，方形像素 B 标志">
    <g className="bit-glyph">{glyph.flatMap((row,y)=>[...row].flatMap((cell,x)=>cell==="1"?[0,1].flatMap(dx=>[0,1].map(dy=><rect key={`${x}-${y}-${dx}-${dy}`} x={50+x*20+dx*9} y={30+y*20+dy*9} width={7} height={7} opacity={.6+((x+y)%5)*.1}/>)):[]))}</g>
  </svg>;
}
