import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';

vi.mock('../../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ profile: null }) }));
vi.mock('../../../context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('../FlowingBorder', () => ({ default: () => null }));
vi.mock('../../../context/ScheduleContext', () => ({
  useSchedule: () => ({
    mySchedule: [], expertSchedule: [], volunteerSchedule: [], spectating: [], loading: false, scheduleError: null,
  }),
}));
vi.mock('../../session/SessionView', () => ({
  default: ({ id }: { id: string }) => <h1>Session {id}</h1>,
}));

import { VersePortalProvider, useOpenVerse } from '../ExploreVerses';

function Opener() {
  const open = useOpenVerse();
  return <button type="button" onClick={() => open('techverse', { x: 0, y: 0 })}>open</button>;
}

function openVerse() {
  render(
    <MemoryRouter>
      <VersePortalProvider mine={new Set()} canSchedule={false}>
        <Opener />
      </VersePortalProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('open'));
}

test('a discipline lists its tracks under one "Tracks" heading, with no chip row', () => {
  openVerse();
  const dialog = screen.getByRole('dialog');
  expect(screen.getAllByRole('heading', { name: 'Tracks' })).toHaveLength(1);
  expect(screen.queryByRole('heading', { name: 'Sessions' })).toBeNull();
  // The old chip row put every track name on a button.
  expect(dialog.querySelectorAll('button[aria-current]')).toHaveLength(0);
});

test('the open discipline is kept in the URL and reopens from it', () => {
  render(
    <MemoryRouter initialEntries={['/disciplines?verse=techverse']}>
      <VersePortalProvider mine={new Set()} canSchedule={false}>
        <p>grid</p>
      </VersePortalProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('dialog', { name: 'TechVerse' })).toBeInTheDocument();
});

test('a session opens inside the discipline page, and Back returns to the list', () => {
  render(
    <MemoryRouter initialEntries={['/disciplines?verse=techverse']}>
      <VersePortalProvider mine={new Set()} canSchedule={false}>
        <p>grid</p>
      </VersePortalProvider>
    </MemoryRouter>,
  );
  const dialog = screen.getByRole('dialog', { name: 'TechVerse' });
  const first = dialog.querySelector('h3 a') as HTMLAnchorElement;
  const id = first.getAttribute('href')!.split('/').pop()!;
  fireEvent.click(first);
  // Same dialog (same world), now showing the session.
  expect(screen.getByRole('heading', { name: `Session ${id}` })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tracks' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { name: 'Tracks' })).toBeInTheDocument();
});

test('a Discover chip can open the discipline straight on a session', () => {
  render(
    <MemoryRouter initialEntries={['/disciplines?verse=techverse&session=s2']}>
      <VersePortalProvider mine={new Set()} canSchedule={false}>
        <p>grid</p>
      </VersePortalProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Session s2' })).toBeInTheDocument();
});

test('the Summit logo takes you home from a discipline and from a track inside it', () => {
  render(
    <MemoryRouter initialEntries={['/disciplines?verse=techverse']}>
      <Routes>
        <Route path="/home" element={<p>dashboard</p>} />
        <Route
          path="/disciplines"
          element={
            <VersePortalProvider mine={new Set()} canSchedule={false}>
              <p>grid</p>
            </VersePortalProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  const home = () => screen.getByRole('link', { name: 'Emerald Summit ’27, back to home' });
  expect(home()).toHaveAttribute('href', '/home');
  expect(home()).toHaveTextContent('Emerald Summit ’27');
  // Still there once a track is open.
  const dialog = screen.getByRole('dialog', { name: 'TechVerse' });
  fireEvent.click(dialog.querySelector('h3 a') as HTMLAnchorElement);
  fireEvent.click(home());
  expect(screen.getByText('dashboard')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).toBeNull();
});
