import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const state = vi.hoisted(() => ({
  role: 'attendee',
  spectating: [] as string[],
  own: [] as string[],
}));

vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'u1' } }, profile: { role: state.role, name: 'Sam Lee' }, loadingProfile: false }),
}));
vi.mock('../../services/auth', () => ({ needsProfileSetup: () => false }));
vi.mock('../../models/profileFields', () => ({ missingGateField: () => null }));
vi.mock('../../models/codeOfConduct', () => ({ needsCodeOfConduct: () => false }));
vi.mock('../../components/ExpertStatus', () => ({
  ExpertDeclinedDialog: () => null,
  ExpertPending: () => null,
  needsExpertApproval: () => false,
}));
vi.mock('../../context/ScheduleContext', () => ({
  ownScheduleKind: (role: string) =>
    role === 'participant' ? 'competing' : role === 'expert' ? 'judging' : role === 'volunteer' ? 'volunteering' : null,
  useSchedule: () => ({ listFor: () => state.own, spectating: state.spectating }),
}));
vi.mock('../../context/AnnouncementsContext', () => ({
  useAnnouncements: () => ({ announcements: [], canPost: false, isUnread: () => false, markRead: vi.fn() }),
}));
vi.mock('../../services/summitContent', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/summitContent')>(),
  useSummitContent: () => 0,
}));
vi.mock('../../services/summitStatus', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/summitStatus')>(),
  useSummitStatus: () => ({ date: null }),
}));
vi.mock('../../services/siteSwitches', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/siteSwitches')>(),
  useSiteSwitches: () => ({ registrationOpen: false, showTimes: false, loaded: true }),
}));
vi.mock('../../components/AppShell', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('../../components/AnnouncementsPanel', () => ({ default: () => null }));
vi.mock('../../components/home/PhotoSlideshow', () => ({ default: () => null }));
vi.mock('../../components/home/QuoteCard', () => ({ default: () => null }));
vi.mock('../../components/home/LinksCard', () => ({ default: () => null }));
vi.mock('../../components/home/AboutSections', () => ({
  AboutAppCard: () => null,
  SponsorsCard: () => null,
  SupportEafCard: () => null,
}));
vi.mock('../RolesPage', () => ({ default: () => null }));
vi.mock('../../models/sessions', () => {
  const base = { track: 'techverse', trackName: 'Engineering', location: 'Lab', room: 'A', duration: '60 min' };
  return {
    MOCK_SESSIONS: [
      { ...base, id: 'a', title: 'Robotics Lab', time: '10:00 AM' },
      { ...base, id: 'b', title: 'Genetics Lab', time: '11:00 AM' },
      { ...base, id: 'c', title: 'Product Design', time: '1:00 PM' },
    ],
    sessionPlace: () => 'Room TBD',
    joinParts: (...parts: (string | undefined)[]) => parts.filter(Boolean).join(' · '),
  };
});

import HomePage from '../HomePage';

function renderHome() {
  return render(<MemoryRouter><HomePage /></MemoryRouter>);
}

beforeEach(() => {
  state.role = 'attendee';
  state.spectating = [];
  state.own = [];
});

describe('Your day for spectators', () => {
  test('shows an empty day, not sample sessions, before they add any', () => {
    renderHome();
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
    expect(screen.queryByText('Robotics Lab')).not.toBeInTheDocument();
    expect(screen.queryByText('Genetics Lab')).not.toBeInTheDocument();
  });

  test('shows only the sessions they are spectating', () => {
    state.spectating = ['b'];
    renderHome();
    expect(screen.getAllByText('Genetics Lab').length).toBeGreaterThan(0);
    expect(screen.queryByText('Robotics Lab')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Design')).not.toBeInTheDocument();
    expect(screen.getByText('Room TBD · Spectating')).toBeInTheDocument();
  });
});
