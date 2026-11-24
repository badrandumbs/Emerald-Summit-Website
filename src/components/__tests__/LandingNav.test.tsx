import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import LandingNav from '../LandingNav';

const summitName = /Summit ['’]27/;

function Location() {
  const location = useLocation();
  return <output data-testid="location">{JSON.stringify({ path: location.pathname, state: location.state })}</output>;
}

function renderNav(path = '/elsewhere') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LandingNav />
      <button type="button">Outside destination</button>
      <Location />
    </MemoryRouter>,
  );
}

function main() {
  return screen.getByRole('navigation', { name: 'Main' });
}

function controlledPanel(trigger: HTMLElement) {
  const id = trigger.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  const panel = document.getElementById(id!);
  expect(panel).not.toBeNull();
  return panel!;
}

beforeEach(() => {
  // Use desktop viewport defaults while retaining each media query's change API.
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: /min-width|hover: hover|pointer: fine/.test(query),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

afterEach(() => vi.unstubAllGlobals());

describe('landing navigation disclosures', () => {
  test('shows four top-level destinations while keeping grouped links hidden until opened', async () => {
    const user = userEvent.setup();
    renderNav();
    expect(within(main()).getAllByRole('button').map((button) => button.textContent?.replace('’', "'").trim()))
      .toEqual(['About', 'Disciplines', "Summit '27", 'Support']);
    expect(within(main()).queryByRole('button', { name: 'Team' })).not.toBeInTheDocument();
    await user.click(within(main()).getByRole('button', { name: 'About' }));
    expect(within(main()).getByRole('button', { name: 'About the Summit' })).toBeVisible();
    expect(within(main()).getByRole('button', { name: 'FAQ' })).toBeVisible();
    expect(within(main()).getByRole('button', { name: 'Contact' })).toBeVisible();
    await user.click(within(main()).getByRole('button', { name: 'Support' }));
    expect(within(main()).queryByRole('button', { name: 'FAQ' })).not.toBeInTheDocument();
    expect(within(main()).getByRole('button', { name: 'Sponsors' })).toBeVisible();
    expect(within(main()).getByRole('button', { name: 'Donate' })).toBeVisible();
  });

  test('mouse hover opens a menu and clicking pins it until clicked again', async () => {
    const user = userEvent.setup();
    renderNav();
    const support = within(main()).getByRole('button', { name: 'Support' });
    await user.hover(support);
    expect(support).toHaveAttribute('aria-expanded', 'true');
    await user.click(support);
    await user.unhover(support);
    expect(support).toHaveAttribute('aria-expanded', 'true');
    await user.click(support);
    expect(support).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowDown enters the submenu, Tab follows its links, and Escape restores the trigger', async () => {
    const user = userEvent.setup();
    renderNav();
    const summit = within(main()).getByRole('button', { name: summitName });
    summit.focus();
    await user.keyboard('{ArrowDown}');
    expect(summit).toHaveAttribute('aria-expanded', 'true');
    const panel = controlledPanel(summit);
    await waitFor(() => expect(within(panel).getByRole('button', { name: 'Keynote' })).toHaveFocus());
    await user.tab();
    expect(within(panel).getByRole('button', { name: 'Experts' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(summit).toHaveAttribute('aria-expanded', 'false');
    expect(summit).toHaveFocus();
    expect(within(main()).queryByRole('button', { name: 'Experts' })).not.toBeInTheDocument();
  });

  test('outside pointer and focus changes close the open menu', async () => {
    const user = userEvent.setup();
    renderNav();
    const about = within(main()).getByRole('button', { name: 'About' });
    const outside = screen.getByRole('button', { name: 'Outside destination' });
    await user.click(about);
    expect(about).toHaveAttribute('aria-expanded', 'true');
    await user.click(outside);
    expect(about).toHaveAttribute('aria-expanded', 'false');
    await user.click(about);
    act(() => outside.focus());
    expect(about).toHaveAttribute('aria-expanded', 'false');
  });

  test('grouped destinations retain their cross-route section targets and close after navigation', async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(within(main()).getByRole('button', { name: summitName }));
    await user.click(within(main()).getByRole('button', { name: 'Team' }));
    expect(screen.getByTestId('location')).toHaveTextContent(JSON.stringify({
      path: '/keynote-and-team', state: { scrollTo: 'team' },
    }));
    expect(within(main()).getByRole('button', { name: summitName })).toHaveAttribute('aria-expanded', 'false');

    await user.click(within(main()).getByRole('button', { name: 'Support' }));
    await user.click(within(main()).getByRole('button', { name: 'Donate' }));
    expect(screen.getByTestId('location')).toHaveTextContent(JSON.stringify({
      path: '/', state: { scrollTo: 'donate' },
    }));
    expect(within(main()).getByRole('button', { name: 'Support' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile navigation exposes all destinations without nested menus and Escape returns focus', async () => {
    const user = userEvent.setup();
    renderNav();
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    await user.click(toggle);
    const mobile = screen.getByRole('navigation', { name: 'Main mobile' });
    await waitFor(() => {
      for (const label of ['About the Summit', 'FAQ', 'Contact', 'Disciplines', 'Keynote', 'Experts', 'Team', 'Sponsors', 'Donate']) {
        expect(within(mobile).getByRole('button', { name: label })).toBeVisible();
      }
    });
    expect(within(mobile).queryByRole('button', { name: summitName })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Main mobile' })).not.toBeInTheDocument());
  });

  test('viewport changes close the old menu and move focus to visible navigation', async () => {
    const user = userEvent.setup();
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const query = '(max-width: 60rem)';
    const viewport = {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
      removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn((value: string) => value === query ? viewport : {
      ...viewport, media: value, matches: /hover: hover|pointer: fine/.test(value),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
    const resize = (mobile: boolean) => act(() => {
      viewport.matches = mobile;
      listeners.forEach((listener) => listener({ matches: mobile, media: query } as MediaQueryListEvent));
    });

    renderNav();
    const summit = within(main()).getByRole('button', { name: summitName });
    summit.focus();
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(within(controlledPanel(summit)).getByRole('button', { name: 'Keynote' })).toHaveFocus());
    resize(true);
    expect(summit).toHaveAttribute('aria-expanded', 'false');
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    expect(toggle).toHaveFocus();

    await user.click(toggle);
    const mobile = screen.getByRole('navigation', { name: 'Main mobile' });
    expect(mobile.contains(document.activeElement)).toBe(true);
    resize(false);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(screen.queryByRole('navigation', { name: 'Main mobile' })).not.toBeInTheDocument());
    expect(main().contains(document.activeElement)).toBe(true);
  });
});
