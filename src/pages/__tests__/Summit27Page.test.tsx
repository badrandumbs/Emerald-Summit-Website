import type { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Summit27Page, { SponsorTiers } from '../Summit27Page';
import LandingNav from '../../components/LandingNav';
import { navItemsForRole } from '../../components/AppShell';
import { EAF_VOLUNTEER_URL } from '../../components/home/AboutSections';
import { SPONSOR_TIERS } from '../../models/sponsors';

const state = vi.hoisted(() => ({
  guard: { ready: true, redirect: null as string | null },
}));
vi.mock('../../components/AppShell', async (importActual) => ({
  ...(await importActual<typeof import('../../components/AppShell')>()),
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../hooks/useRequireProfile', () => ({ useRequireProfile: () => state.guard }));

beforeEach(() => {
  state.guard = { ready: true, redirect: null };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/summit-27/:tab" element={<Summit27Page />} />
        <Route path="/roles" element={<p>Roles page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Summit '27 page", () => {
  test('is signed-in only: a visitor is sent to sign in', () => {
    state.guard = { ready: false, redirect: '/roles' };
    renderAt('/summit-27/sponsors');
    expect(screen.getByText('Roles page')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Sponsor tiers, highest first' })).not.toBeInTheDocument();
  });

  test('the landing navbar has no Summit \'27 link', () => {
    render(<MemoryRouter><LandingNav /></MemoryRouter>);
    expect(within(screen.getByRole('navigation', { name: 'Main' })).queryByText("Summit '27")).not.toBeInTheDocument();
  });

  test('the sidebar has one Summit \'27 tab, opening Keynote, for every role', () => {
    for (const role of ['participant', 'attendee', 'expert', 'volunteer', 'admin']) {
      const items = navItemsForRole(role).filter((n) => n.to.startsWith('/summit-27'));
      expect(items.map((n) => [n.label, n.to, n.opens])).toEqual([["Summit '27", '/summit-27', '/summit-27/keynote']]);
    }
  });

  test('subtabs switch between keynote, team and sponsors, with Donate on each', async () => {
    renderAt('/summit-27/keynote');
    expect(screen.getByText(/keynote speaker will be announced soon/)).toBeInTheDocument();
    expect(screen.getByText('Saturday, January 23, 2027 · 9 AM to 5 PM · Emerald High School, Dublin, CA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Donate/ })).toBeInTheDocument();

    const tabs = screen.getByRole('navigation', { name: "Summit '27" });
    await userEvent.click(within(tabs).getByRole('link', { name: /Team/ }));
    expect(screen.getByRole('heading', { level: 1, name: "Summit '27" })).toBeInTheDocument();
    expect(screen.getByText(/About Me pages/)).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole('link', { name: /Sponsors/ }));
    const tiers = screen.getByRole('list', { name: 'Sponsor tiers, highest first' });
    expect(within(tiers).getAllByRole('listitem').filter((li) => li.parentElement === tiers)).toHaveLength(SPONSOR_TIERS.length);
    expect(screen.getByRole('button', { name: /Donate/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volunteer with EAF/ })).toHaveAttribute('href', EAF_VOLUNTEER_URL);
  });

  test('an unknown subtab opens Keynote', () => {
    renderAt('/summit-27/nope');
    expect(screen.getByRole('heading', { level: 1, name: "Summit '27" })).toBeInTheDocument();
    expect(screen.getByText(/keynote speaker will be announced soon/)).toBeInTheDocument();
  });

  test('sponsors show in their tier; an empty tier says Open', () => {
    render(<SponsorTiers sponsors={[{ name: 'Acme', tier: 'Pillar', url: 'https://acme.test', logo: '/acme.png' }]} />);
    const pillar = screen.getByRole('list', { name: 'Pillar sponsors' });
    expect(within(pillar).getByRole('img', { name: 'Acme' })).toBeInTheDocument();
    expect(screen.getAllByText('Open')).toHaveLength(SPONSOR_TIERS.length - 1);
  });

  test('each tier shows its rank, Capstone first and marked top tier', () => {
    render(<SponsorTiers />);
    const n = SPONSOR_TIERS.length;
    SPONSOR_TIERS.forEach((_, i) => expect(screen.getByText(`Tier ${i + 1} of ${n}`)).toBeInTheDocument());
    const items = within(screen.getByRole('list', { name: 'Sponsor tiers, highest first' })).getAllByRole('heading', { level: 3 });
    expect(items.map((h) => h.textContent)).toEqual(SPONSOR_TIERS.map((t) => t.name));
    expect(screen.getByText(/Top tier/)).toBeInTheDocument();
  });
});
