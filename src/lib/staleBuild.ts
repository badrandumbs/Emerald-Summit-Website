// Every page except the landing page is its own file (/assets/<Page>-<hash>.js),
// downloaded the first time someone opens it. Each push to main deploys a new
// build, and Vercel serves only that build's files: a tab opened before the
// deploy still asks for the old file names and gets a 404. Before this, React
// then dropped the whole page and left a blank screen until a refresh.
//
// So when a page file can't load, reload once: the browser gets the new
// index.html, which names the new files, and lands on the page that was
// clicked. A guard in sessionStorage stops a reload loop if the file is
// missing for some other reason; then PageRouteBoundary shows its message.
import { lazy, type ComponentType } from 'react';

const KEY = 'es-stale-build-reload';
const GUARD_MS = 30_000;
let reloading = false;

/** Chrome, Firefox and Safari's wording for a failed import(), plus Vite's CSS preload error. */
export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(text);
}

/**
 * Reloads the page to pick up the latest build. Returns false, and does
 * nothing, when offline, when it already reloaded in the last 30 seconds, or
 * when sessionStorage is blocked (no guard, so no reload).
 */
export function reloadForNewBuild(): boolean {
  if (reloading) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < GUARD_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
}

/** React.lazy for a route page that reloads into the new build when its file is gone. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load().catch((error: unknown) => {
      // Never settles: the page is about to reload, so show the loading state until it does.
      if (isChunkLoadError(error) && reloadForNewBuild()) return new Promise<never>(() => {});
      throw error;
    }),
  );
}

/** Vite reports failed preloads here too (also for any import() outside lazyPage). */
export function installStaleBuildReload() {
  window.addEventListener('vite:preloadError', (event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (isChunkLoadError(payload)) reloadForNewBuild();
  });
}

/** For tests. */
export function resetStaleBuildReload() {
  reloading = false;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
