import type { SyntheticEvent } from "react";
import images from "./data/images.json";
import { sitePath } from "./site-path";

type ImageInfo = { width: number; height: number; variants: { url: string; width: number }[]; fullUrl?: string };
const manifest = images as Record<string, ImageInfo>;
const failedImage = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#151519"/><text x="320" y="185" fill="#aaaab5" font-family="sans-serif" font-size="22" text-anchor="middle">图片暂不可用</text></svg>')}`;

function showImageFallback(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.failed) return;
  image.dataset.failed = "true";
  image.removeAttribute("srcset");
  image.removeAttribute("sizes");
  image.alt = image.alt ? `${image.alt}（加载失败）` : "图片加载失败";
  image.src = failedImage;
}

export function resourceImageProps(url: string, sizes: string) {
  const image = manifest[url];
  const preview = image?.variants.find(variant => variant.width >= 960) || image?.variants.at(-1);
  return {
    src: preview ? sitePath(preview.url) : url.startsWith("/media/") ? sitePath(url) : url,
    srcSet: image?.variants.length ? image.variants.map(variant => `${sitePath(variant.url)} ${variant.width}w`).join(", ") : undefined,
    sizes, width: image?.width, height: image?.height, decoding: "async" as const, onError: showImageFallback,
  };
}

export function fullImageSrc(url: string) {
  const source = manifest[url]?.fullUrl || url;
  return source.startsWith("/media/") ? sitePath(source) : source;
}
