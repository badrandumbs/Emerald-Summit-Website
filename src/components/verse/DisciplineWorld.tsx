import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { VERSE_VIBES, type VerseVibe } from '../../models/verseVibes';
import { cn } from '@/lib/utils';
import { reducedMotion } from './useCircleReveal';
import type { ViewTargets, WorldKind, WorldView } from './worlds/engine';

export interface DisciplineWorldHandle {
  /** Scatter the world back out (the reverse of its entrance) over `ms`. */
  leave(ms: number): void;
  /** 0 at the top of the page, 1 once scrolled well into it: the world eases up, back and dims. */
  setScroll(progress: number): void;
}

/** The six disciplines have their own worlds; one added later gets the emerald. */
export function worldKindFor(discipline: string | null | undefined): WorldKind {
  const key = discipline?.toLowerCase();
  return (key && VERSE_VIBES[key]?.motif) || 'gem';
}

/** Where an open discipline's world sits in the full-screen page. */
function fullTargets(): ViewTargets {
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth;
  // Matches the open discipline's hero (ExploreVerses' header): title bottom left, world above right.
  if (w >= 1024) return { fx: 0.66, fy: 0.34, fill: 0.55 };
  if (w >= 640) return { fx: 0.68, fy: 0.24, fill: 0.5 };
  return { fx: 0.62, fy: 0.2, fill: 0.58 };
}

export function useFullWorldTargets(): ViewTargets {
  const [t, setT] = useState(fullTargets);
  useEffect(() => {
    const onResize = () => setT(fullTargets());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return t;
}

// jsdom has no WebGL; skip loading three.js at all in tests.
const canRender = () => typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent);

/**
 * A discipline's 3D world (see worlds/worlds.ts), drawn into this canvas by
 * the shared engine. three.js loads on first use, so it stays out of the
 * first paint. Transparent until the first frame: put the discipline's
 * background color behind it.
 */
const DisciplineWorld = forwardRef<
  DisciplineWorldHandle,
  {
    discipline: string | null | undefined;
    vibe: VerseVibe;
    theme: 'light' | 'dark';
    targets: ViewTargets;
    /** Full-screen (an open discipline): plays a longer entrance, panels pause under it. */
    full?: boolean;
    /** Delay before the entrance starts, in ms (panels stagger theirs). */
    delay?: number;
    interactive?: boolean;
    /**
     * Keep the world unbuilt (its entrance not started) while true: an opening
     * scene is playing over it (DisciplineIntro), so its entrance plays after,
     * where it can be seen.
     */
    hold?: boolean;
    /** How long after the hold lifts the entrance starts, in ms (so the opening's fade can be enjoyed first). */
    afterHoldMs?: number;
    className?: string;
  }
>(function DisciplineWorld(
  { discipline, vibe, theme, targets, full = false, delay = 0, interactive = false, hold = false, afterHoldMs = 0, className },
  ref,
) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<WorldView | null>(null);
  const base = useRef(targets);
  base.current = targets;
  const scroll = useRef(0);
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const started = useRef(false);
  /** The entrance, quicker since Nov 23, 2026. */
  const enter = (v: WorldView, extra = 0) => {
    if (started.current || holdRef.current) return;
    started.current = true;
    v.animateIntro(1, full ? 1100 : 950, delay + extra);
  };
  const kind = worldKindFor(discipline);

  const placed = (s: number): ViewTargets => {
    const t = base.current;
    return { fx: t.fx, fy: t.fy - 0.2 * s, fill: t.fill * (1 - 0.3 * s) };
  };

  useEffect(() => {
    const el = canvas.current;
    if (!el || !canRender()) return;
    let cancelled = false;
    import('./worlds/engine')
      .then(({ createView }) => {
        if (cancelled) return;
        const v = createView(el, {
          kind,
          vibe,
          light: theme === 'light',
          full,
          interactive,
          reduced: reducedMotion(),
        });
        if (!v) return;
        view.current = v;
        v.setTargets(placed(scroll.current), true);
        started.current = false;
        enter(v);
      })
      .catch(() => {
        // three.js failed to load: the background color stands alone.
      });
    return () => {
      cancelled = true;
      view.current?.dispose();
      view.current = null;
    };
    // The world is rebuilt only when its look changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, vibe.background, vibe.accent, theme, full]);

  useEffect(() => {
    view.current?.setTargets(placed(scroll.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets.fx, targets.fy, targets.fill]);

  useEffect(() => {
    view.current?.setInteractive(interactive);
  }, [interactive]);

  useEffect(() => {
    if (!hold && view.current) enter(view.current, afterHoldMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold]);

  useImperativeHandle(ref, () => ({
    leave(ms) {
      view.current?.animateIntro(0, ms);
    },
    setScroll(s) {
      scroll.current = s;
      view.current?.setTargets(placed(s));
      if (canvas.current) canvas.current.style.opacity = String(1 - 0.55 * s);
    },
  }));

  return <canvas ref={canvas} aria-hidden className={cn('pointer-events-none block h-full w-full', className)} />;
});

export default DisciplineWorld;
