import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MetricsPage from '../MetricsPage';
import { MOCK_SESSIONS } from '../../models/sessions';
import type { SummitMetrics } from '../../models/metrics';

const [s1, s2] = MOCK_SESSIONS.filter((s) => s.track !== 'keynote');
const data: SummitMetrics = {
  people: [
    { id: 'a', role: 'participant', school: 'Dublin High School', grade: '10' },
    { id: 'idle', role: 'participant', school: 'Emerald High School', grade: '11' },
    { id: 'e', role: 'expert', school: 'No school given', grade: 'No grade given' },
    { id: 'w', role: 'expert', school: 'No school given', grade: 'No grade given' },
  ],
  registrations: [
    { userId: 'a', sessionId: s1.id, disciplineId: 'tech', disciplineName: 'Tech', type: 'participant' },
    { userId: 'e', sessionId: s1.id, disciplineId: 'tech', disciplineName: 'Tech', type: 'expert' },
  ],
};

vi.mock('../../components/AppShell', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../hooks/useRequireProfile', () => ({ useRequireRole: () => ({ ready: true, redirect: null }) }));
vi.mock('../../services/organizer', () => ({
  fetchSummitMetrics: async () => data,
  fetchExpertRequests: async () => [{ userId: 'w' }],
  fetchExpertDashboard: async () => [{ userId: 'e', stage: 'verified' }, { userId: 'w', stage: 'not_verified' }],
}));
vi.mock('../../services/summitContent', () => ({ contentSource: () => 'database', useSummitContent: () => 0 }));

const tile = (label: string) => screen.getByText(label).previousElementSibling?.textContent;

describe('Organizer metrics', () => {
  test('counts experts, and leaves out accounts with no track sign-up', async () => {
    render(<MemoryRouter><MetricsPage /></MemoryRouter>);
    await screen.findByText('Expert accounts');
    expect(tile('Expert accounts')).toBe('2');
    expect(await screen.findByText('Not verified')).toBeInTheDocument();
    expect(tile('Not verified')).toBe('1');
    expect(tile('Verified')).toBe('1');
    expect(tile('Serving in a track')).toBe('1');
    expect(screen.getByRole('link', { name: s2.title })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: s1.title })).toBeNull();

    expect(tile('Registered for a track')).toBe('1');
    expect(screen.getByText(/Accounts with no track sign-up are not counted/)).toBeInTheDocument();
    const school = screen.getByRole('heading', { name: 'Sign-ups by school' }).parentElement!;
    expect(within(school).getByText('Dublin High School')).toBeInTheDocument();
    expect(within(school).queryByText('Emerald High School')).toBeNull();
  });
});
