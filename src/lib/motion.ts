/**
 * The site's easing curves for JS animations (WAAPI `easing`, framer-motion
 * `ease`). They match the CSS tokens in src/landing/tokens.css
 * (--ease-out, --ease-in-out), which JS can't read through var().
 */
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** The same curves as framer-motion cubic-bezier arrays. */
export const EASE_OUT_ARRAY = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT_ARRAY = [0.65, 0, 0.35, 1] as const;
