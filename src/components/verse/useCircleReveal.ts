import { useCallback, useLayoutEffect, useRef } from 'react';

export type Origin = { x: number; y: number };

export const reducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The middle of the screen, for pages opened without a click point. */
export const screenCenter = (): Origin => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

/**
 * A discipline's world opening like the app's portal: a circle of its color
 * grows from `origin` to the farthest corner, then the content fades in over
 * the last two thirds (mobile timings: 620ms in, 420ms out). `close(done)`
 * shrinks it back to the origin, then calls `done`.
 */
export function useCircleReveal(origin: Origin) {
  const shell = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  const farthest = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return Math.max(
      Math.hypot(origin.x, origin.y),
      Math.hypot(w - origin.x, origin.y),
      Math.hypot(origin.x, h - origin.y),
      Math.hypot(w - origin.x, h - origin.y),
    );
  }, [origin]);

  useLayoutEffect(() => {
    const el = shell.current;
    const inner = content.current;
    if (!el || !inner) return;
    if (reducedMotion() || typeof el.animate !== 'function') {
      el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
      return;
    }
    const at = `at ${origin.x}px ${origin.y}px`;
    el.animate([{ clipPath: `circle(0px ${at})` }, { clipPath: `circle(${farthest()}px ${at})` }], {
      duration: 620,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
      fill: 'forwards',
    });
    inner.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400,
      delay: 220,
      easing: 'ease-out',
      fill: 'backwards',
    });
  }, [origin, farthest]);

  const close = useCallback(
    (done: () => void) => {
      if (closing.current) return;
      closing.current = true;
      const el = shell.current;
      if (!el || reducedMotion() || typeof el.animate !== 'function') {
        done();
        return;
      }
      const at = `at ${origin.x}px ${origin.y}px`;
      const anim = el.animate(
        [{ clipPath: `circle(${farthest()}px ${at})` }, { clipPath: `circle(0px ${at})` }],
        { duration: 420, easing: 'cubic-bezier(0.32, 0, 0.67, 0)', fill: 'forwards' },
      );
      anim.onfinish = done;
    },
    [origin, farthest],
  );

  return { shell, content, close };
}

/**
 * New content inside an open world (a session after the discipline's list):
 * it grows out of the click point while the world around it stays put.
 */
export function growIn(el: HTMLElement | null, origin: Origin | null) {
  if (!el || reducedMotion() || typeof el.animate !== 'function') return;
  const r = el.getBoundingClientRect();
  const from = origin ?? { x: r.left + r.width / 2, y: r.top + 80 };
  const x = from.x - r.left;
  const y = from.y - r.top;
  const far = Math.max(
    Math.hypot(x, y),
    Math.hypot(r.width - x, y),
    Math.hypot(x, r.height - y),
    Math.hypot(r.width - x, r.height - y),
  );
  const at = `at ${x}px ${y}px`;
  el.animate(
    [
      { clipPath: `circle(0px ${at})`, opacity: 0.3 },
      { clipPath: `circle(${far}px ${at})`, opacity: 1 },
    ],
    { duration: 520, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  );
}
