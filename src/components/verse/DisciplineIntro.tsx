import { useEffect, useRef } from 'react';
import type { VerseVibe } from '../../models/verseVibes';
import { EASE_OUT } from '@/lib/motion';
import { worldKindFor } from './DisciplineWorld';
import { reducedMotion } from './useCircleReveal';

/** sessionStorage: which disciplines' openings have played this browser session. */
const PLAYED_KEY = 'discipline-intro-played';
/** Matches INTRO_MS in worlds/intros.ts (kept here so the page needn't load three.js to know it). */
const INTRO_MS = 2000;
/** NovaSphere's campfire is a little shorter. */
const SHORTER: Record<string, number> = { stars: 1600 };
const BLUR_IN_MS = 250;
/** The scene's slow fade into the page. */
const CLEAR_MS = 1300;

function played(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(PLAYED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

// jsdom has no WebGL; tests never play an opening.
const canRender = () => typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent);

/**
 * Whether opening `discipline` should play its scene: once per browser
 * session for each discipline (like the Summit '27 intro), never under
 * reduced motion, and only the six with a scene (intros.ts).
 */
export function introDue(discipline: string): boolean {
  const kind = worldKindFor(discipline);
  return canRender() && !reducedMotion() && kind !== 'gem' && !played().includes(discipline);
}

function markPlayed(discipline: string) {
  try {
    sessionStorage.setItem(PLAYED_KEY, JSON.stringify([...new Set([...played(), discipline])]));
  } catch {
    // Storage blocked: it may play again, which is harmless.
  }
}

/**
 * A discipline's opening, over its page: the page blurs (like the Summit '27
 * intro), the discipline's scene plays (a computer writing code, a money bag,
 * a brain taking shape, a gavel strike, a painting and a sculpture, fire and
 * smoke), then the scene blurs away into the page as the page comes clear.
 * A click or Escape skips it. Calls `onDone` when it has gone.
 */
export default function DisciplineIntro({
  discipline,
  vibe,
  theme,
  onClear,
  onDone,
}: {
  discipline: string;
  vibe: VerseVibe;
  theme: 'light' | 'dark';
  /** The scene starts blurring away: the page can bring its words in. */
  onClear?: () => void;
  onDone: () => void;
}) {
  const blur = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const skip = useRef<() => void>(() => {});
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const clearRef = useRef(onClear);
  clearRef.current = onClear;

  useEffect(() => {
    markPlayed(discipline);
    const b = blur.current;
    const el = canvas.current;
    let cancelled = false;
    let clearing = false;
    let dispose: (() => void) | null = null;
    const anims: Animation[] = [];
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      doneRef.current();
    };
    // The scene blurs and grows away while the page underneath comes clear.
    const clear = () => {
      if (clearing) return;
      clearing = true;
      clearRef.current?.();
      if (!b || !el || typeof el.animate !== 'function') return finish();
      anims.push(
        el.animate(
          [
            { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
            { opacity: 0, filter: 'blur(26px)', transform: 'scale(1.08)' },
          ],
          { duration: CLEAR_MS, easing: 'ease-in-out', fill: 'forwards' },
        ),
      );
      const out = b.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: CLEAR_MS,
        delay: 80,
        easing: 'ease-in-out',
        fill: 'forwards',
      });
      anims.push(out);
      out.finished.then(finish, () => {});
    };
    skip.current = clear;

    b?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: BLUR_IN_MS, easing: EASE_OUT, fill: 'forwards' });
    import('./worlds/engine')
      .then(({ createView }) => {
        if (cancelled || !el) return;
        const v = createView(el, {
          kind: worldKindFor(discipline),
          vibe,
          light: theme === 'light',
          full: true,
          interactive: false,
          reduced: false,
          intro: true,
        });
        if (!v) return clear();
        dispose = () => v.dispose();
        v.setTargets({ fx: 0.5, fy: 0.5, fill: 0.66 }, true);
        v.animateIntro(1, SHORTER[worldKindFor(discipline)] ?? INTRO_MS, 80, clear);
      })
      .catch(clear);

    // Escape skips the opening, not the page: this runs before the page's own
    // handler (capture) and marks the key handled.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || clearing) return;
      e.preventDefault();
      clear();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKey, true);
      anims.forEach((a) => a.cancel());
      dispose?.();
    };
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 z-20" onClick={() => skip.current()}>
      <div
        ref={blur}
        className="absolute inset-0 backdrop-blur-xl backdrop-saturate-150"
        style={{ opacity: 0, background: `${vibe.background}55` }}
      />
      <canvas ref={canvas} className="pointer-events-none absolute inset-0 block h-full w-full" />
    </div>
  );
}
