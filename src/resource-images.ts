import images from "./data/images.json";
import { sitePath } from "./site-path";

type ImageInfo = { width: number; height: number; variants: { url: string; width: number }[] };
const manifest = images as Record<string, ImageInfo>;

export function resourceImageProps(url: string, sizes: string) {
  const image = manifest[url];
  const preview = image?.variants.find(variant => variant.width >= 960) || image?.variants.at(-1);
  return {
    src: preview ? sitePath(preview.url) : url.startsWith("/media/") ? sitePath(url) : url,
    srcSet: image?.variants.length ? image.variants.map(variant => `${sitePath(variant.url)} ${variant.width}w`).join(", ") : undefined,
    sizes, width: image?.width, height: image?.height, decoding: "async" as const,
  };
}
