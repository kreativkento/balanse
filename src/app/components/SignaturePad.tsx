import { useEffect, useRef, type PointerEvent, type RefObject } from 'react';

export function exportTransparentSignaturePng(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const { width, height } = canvas;
  if (width < 1 || height < 1) return null;

  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 12) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) return null;

  const pad = 12;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const cropW = Math.min(width - left, maxX - minX + 1 + pad * 2);
  const cropH = Math.min(height - top, maxY - minY + 1 + pad * 2);

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) return null;
  croppedCtx.clearRect(0, 0, cropW, cropH);
  croppedCtx.drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);
  return cropped.toDataURL('image/png');
}

export function SignaturePad({
  onInkChange,
  canvasRef,
}: {
  onInkChange: (hasInk: boolean) => void;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const sizeRef = useRef({ w: 0, h: 0 });
  const onInkChangeRef = useRef(onInkChange);
  onInkChangeRef.current = onInkChange;

  const pointFromEvent = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 8 || h < 8) return;
    if (sizeRef.current.w === w && sizeRef.current.h === h && canvas.width > 0) return;
    sizeRef.current = { w, h };
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1E2A35';
    ctx.lineWidth = 2.25 * dpr;
    hasInkRef.current = false;
    onInkChangeRef.current(false);
  };

  useEffect(() => {
    setupCanvas();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => setupCanvas());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pointFromEvent(e);
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = canvasRef.current?.getContext('2d', { alpha: true });
    if (!ctx) return;
    const next = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
    last.current = next;
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      onInkChange(true);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    last.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-40 sm:h-52 w-full rounded-2xl bg-[#F8F3E8] border-2 border-[#D4CDB5]/70 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none cursor-crosshair bg-transparent"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="pointer-events-none absolute left-6 right-6 bottom-8 h-px bg-[#c49a3c]/50" />
      <p className="pointer-events-none absolute left-0 right-0 bottom-3 text-center text-[#B0A898] text-[11px] uppercase tracking-widest">
        Sign here
      </p>
    </div>
  );
}
