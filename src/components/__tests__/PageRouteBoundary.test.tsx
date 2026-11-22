import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import PageRouteBoundary from '../PageRouteBoundary';
import { isChunkLoadError, lazyPage, resetStaleBuildReload } from '../../lib/staleBuild';

const auth = vi.hoisted(() => ({ session: null as null | object }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth }));

const STALE = () =>
  Promise.reject(new TypeError('Failed to fetch dynamically imported module: https://x/assets/SchedulePage-OLD.js'));

const reload = vi.fn();
const realLocation = window.location;

beforeEach(() => {
  resetStaleBuildReload();
  reload.mockReset();
  auth.session = null;
  Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, reload } });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  vi.restoreAllMocks();
});

function Home() {
  const [count, setCount] = useState(0);
  return (
    <>
      <h1>Summit home</h1>
      <Link to="/next">Next page</Link>
      <Link to="?view=alternate">Change view</Link>
      <button onClick={() => setCount(count + 1)}>Selected {count}</button>
    </>
  );
}

function renderApp(Next: React.ComponentType) {
  return render(
    <MemoryRouter initialEntries={['/home']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PageRouteBoundary>
        <Routes>
          <Route path="/" element={<h1>Landing</h1>} />
          <Route path="/home" element={<Home />} />
          <Route path="/next" element={<Next />} />
        </Routes>
      </PageRouteBoundary>
    </MemoryRouter>,
  );
}

describe('page loading and recovery', () => {
  test('a page file from an old deploy reloads into the new build instead of going blank', async () => {
    const user = userEvent.setup();
    renderApp(lazyPage(STALE));
    await user.click(screen.getByRole('link', { name: 'Next page' }));
    await act(async () => {});
    expect(reload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  test('if the reload already happened and the file is still missing, it offers Reload and Home', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    sessionStorage.setItem('es-stale-build-reload', String(Date.now()));
    const user = userEvent.setup();
    renderApp(lazyPage(STALE));
    await user.click(screen.getByRole('link', { name: 'Next page' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("This page didn't load");
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
  });

  test('offline, it does not reload into a browser error page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const user = userEvent.setup();
    renderApp(lazyPage(STALE));
    await user.click(screen.getByRole('link', { name: 'Next page' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  test('a page that throws while rendering is contained, and Home works again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    auth.session = {};
    const user = userEvent.setup();
    renderApp(() => { throw new Error('boom'); });
    await user.click(screen.getByRole('link', { name: 'Next page' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to Home' }));
    expect(await screen.findByRole('heading', { name: 'Summit home' })).toBeVisible();
  });

  test('the current page stays up while the next one downloads', async () => {
    let finish!: () => void;
    const loaded = new Promise<void>((resolve) => { finish = resolve; });
    const user = userEvent.setup();
    renderApp(lazyPage(async () => { await loaded; return { default: () => <h1>Next</h1> }; }));
    await user.click(screen.getByRole('link', { name: 'Next page' }));
    expect(screen.getByRole('heading', { name: 'Summit home' })).toBeVisible();
    await act(async () => finish());
    expect(await screen.findByRole('heading', { name: 'Next' })).toBeVisible();
  });

  test('query-string navigation keeps the page and its state', async () => {
    const user = userEvent.setup();
    renderApp(() => null);
    await user.click(screen.getByRole('button', { name: 'Selected 0' }));
    await user.click(screen.getByRole('link', { name: 'Change view' }));
    expect(screen.getByRole('button', { name: 'Selected 1' })).toBeVisible();
  });
});

test('recognizes each browser\'s failed-import message', () => {
  expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /assets/a.js'))).toBe(true);
  expect(isChunkLoadError(new TypeError('error loading dynamically imported module: /assets/a.js'))).toBe(true);
  expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
  expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/a.css'))).toBe(true);
  expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
});
