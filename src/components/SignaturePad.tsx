// Draw-your-signature box for the agreement step (ProfileSetupPage). The
// signature only gates "Agree and continue"; it is not saved anywhere.
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function SignaturePad({ onChange, className }: { onChange: (signed: boolean) => void; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Match the bitmap to the box's real size, and again whenever it changes
  // (layout settling, window resize): a stale size stretches the strokes.
  // Resizing a canvas wipes it, so a resize also clears the signature.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setSigned((was) => {
        if (was) onChangeRef.current(false);
        return false;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    // The first touch counts (it leaves a mark), so "Sign here" goes away at once.
    if (!signed) {
      setSigned(true);
      onChange(true);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = getComputedStyle(e.currentTarget).color;
    const [x, y] = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y); // a tap leaves a dot
    ctx.stroke();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const [x, y] = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onChange(false);
  };

  return (
    <div className={cn('rounded-xl border border-border bg-secondary/40 px-4 py-5', className)}>
      <div className="mx-auto w-full max-w-[460px]">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold">Your signature</span>
          <span className="text-[12px] text-muted-foreground">{signed ? 'Signed' : 'Draw with your mouse or finger'}</span>
        </div>
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border-2 border-dashed bg-background transition-colors',
            signed ? 'border-emerald' : 'border-emerald/50',
          )}
        >
          <canvas
            ref={canvasRef}
            aria-label="Signature pad: draw your signature with a mouse or finger"
            role="img"
            className="block h-36 w-full cursor-crosshair touch-none text-foreground"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
          />
          <div aria-hidden className="pointer-events-none absolute inset-x-6 bottom-8 border-b border-muted-foreground/40" />
          <span aria-hidden className="pointer-events-none absolute bottom-8 left-6 mb-1 text-lg leading-none text-muted-foreground/60">×</span>
          {!signed && (
            <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-sm text-muted-foreground">
              Sign here to agree
            </span>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clear}
            disabled={!signed}
            className="rounded-md px-2 py-1 text-[13px] font-semibold text-emerald transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
