"use client";
import { useEffect, useRef } from "react";

export default function PixelText({ text, interactive = false, className = "" }: { text: string; interactive?: boolean; className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!, ctx = canvas.getContext("2d");
    if (!ctx) return;
    const source = document.createElement("canvas"), low = document.createElement("canvas"), lowCtx = low.getContext("2d")!;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, dpr = 1, frame = 0, visible = false, disposed = false, strength = 0, target = 0, mouseX = 0, mouseY = 0;
    const paint = (block: number) => {
      if (block <= 1) ctx.drawImage(source, 0, 0, width, height);
      else {
        const w = Math.max(1, Math.ceil(width / block)), h = Math.max(1, Math.ceil(height / block));
        if (low.width !== w) low.width = w;
        if (low.height !== h) low.height = h;
        lowCtx.clearRect(0, 0, low.width, low.height); lowCtx.drawImage(source, 0, 0, low.width, low.height);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(low, 0, 0, low.width, low.height, 0, 0, width, height); ctx.imageSmoothingEnabled = true;
      }
    };
    const schedule = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw); };
    const draw = (time: number) => {
      frame = 0; if (!visible || document.hidden || !width) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
      strength += (target - strength) * .18;
      if (motion.matches) { strength = 0; target = 0; }
      paint(1); canvas.dataset.label = text;
      if (interactive && strength > .01) {
        ctx.save(); ctx.beginPath(); ctx.arc(mouseX, mouseY, Math.min(70, width / 3), 0, Math.PI * 2); ctx.clip(); ctx.clearRect(0, 0, width, height);
        // A small local grid keeps the heading readable instead of dissolving it.
        ctx.translate(Math.sin(time / 210) * strength * .7, 0); paint(1 + strength * 2.2); ctx.restore();
      }
      canvas.dataset.pixelStrength = strength.toFixed(2);
      if (Math.abs(target - strength) > .002 || target > 0 && interactive) schedule();
    };
    const resize = () => {
      const rect = root.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
      const style = getComputedStyle(root);
      source.width = canvas.width; source.height = canvas.height;
      const c = source.getContext("2d")!; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      c.letterSpacing = style.letterSpacing; c.fillStyle = style.color; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, width / 2, height / 2);
      root.dataset.ready = "true"; schedule();
    };
    const pointer = (event: PointerEvent) => { if (!interactive || event.pointerType !== "mouse" || motion.matches) return; const rect = root.getBoundingClientRect(); mouseX = event.clientX - rect.left; mouseY = event.clientY - rect.top; target = 1; schedule(); };
    const leave = () => { target = 0; schedule(); };
    const sync = () => {
      cancelAnimationFrame(frame); frame = 0;
      if (!visible || document.hidden) return;
      if (motion.matches) { strength = 0; target = 0; }
      resize(); schedule();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); observer.observe(root);
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(root);
    root.addEventListener("pointermove", pointer); root.addEventListener("pointerleave", leave); document.addEventListener("visibilitychange", sync); motion.addEventListener("change", sync);
    document.fonts.ready.then(() => { if (!disposed) resize(); });
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); root.removeEventListener("pointermove", pointer); root.removeEventListener("pointerleave", leave); document.removeEventListener("visibilitychange", sync); motion.removeEventListener("change", sync); };
  }, [text, interactive]);
  return <span ref={rootRef} className={`pixel-text ${className}`} role="img" aria-label={text}><span aria-hidden="true">{text}</span><canvas ref={canvasRef} aria-hidden="true"/></span>;
}
