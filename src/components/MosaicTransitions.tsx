// The R/G ramps send every point in an 8px cell to the same source sample.
const pixelMap = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><defs><linearGradient id="x"><stop stop-color="#ff0000"/><stop offset="1" stop-color="#000000"/></linearGradient><linearGradient id="y" x2="0" y2="1"><stop stop-color="#00ff00"/><stop offset="1" stop-color="#000000"/></linearGradient></defs><rect width="8" height="8" fill="url(#x)"/><rect width="8" height="8" fill="url(#y)" style="mix-blend-mode:screen"/></svg>');

export default function MosaicTransitions() {
  return <svg className="mosaic-filters" width="0" height="0" aria-hidden="true"><defs>
    <filter id="browser-mosaic" x="0" y="0" width="100%" height="100%" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feImage href={pixelMap} x="0" y="0" width="8" height="8" preserveAspectRatio="none" result="pixel-cell"/>
      <feTile in="pixel-cell" result="pixel-map"/>
      <feDisplacementMap in="SourceGraphic" in2="pixel-map" scale="8" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    {[2, 4].map(size => <filter key={size} id={`cover-mosaic-${size}`} x="0" y="0" width="100%" height="100%" primitiveUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
      <feImage href={pixelMap} x="0" y="0" width={size} height={size} preserveAspectRatio="none" result="pixel-cell"/>
      <feTile in="pixel-cell" result="pixel-map"/>
      <feDisplacementMap in="SourceGraphic" in2="pixel-map" scale={size} xChannelSelector="R" yChannelSelector="G"/>
    </filter>)}
  </defs></svg>;
}
