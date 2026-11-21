import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BeAMentorPage from '../BeAMentorPage';
import ExpertApprovalsPage from '../ExpertApprovalsPage';
import BeamentorBanner from '../../components/BeamentorBanner';
import { BEAMENTOR_URL } from '../../models/beamentor';

const state = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
  refresh: vi.fn(),
  mark: vi.fn(),
  dashboard: vi.fn(),
  review: vi.fn(),
  updateUser: vi.fn(),
  meta: {} as Record<string, unknown>,
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({
  session: { user: { id: 'user-1', email: 'expert@example.com', user_metadata: state.meta } },
  profile: state.profile,
  loadingProfile: false,
  refreshProfile: state.refresh,
}) }));
vi.mock('../../components/AuthLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</>, AUTH_ENTER: '', authStagger: () => ({}) }));
vi.mock('../../components/AppShell', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../../hooks/useRequireProfile', () => ({ useRequireRole: () => ({ ready: true, redirect: null, roleName: 'admin' }) }));
vi.mock('../../services/auth', () => ({
  needsProfileSetup: () => false,
  markBeamentorSubmitted: () => state.mark(),
  signOut: vi.fn(),
}));
vi.mock('../../services/organizer', () => ({
  fetchExpertDashboard: () => state.dashboard(),
  fetchExpertRequests: async () => [],
  markExpertQueueSeen: async () => {},
  reviewExpert: (id: string, approve: boolean) => state.review(id, approve),
}));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { updateUser: (a: unknown) => state.updateUser(a) } } }));
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

const expert = {
  id: 'user-1', name: 'Dr. Rivera', email: 'expert@example.com', role: 'expert', expert_status: 'pending',
  profile_setup_complete: true, code_of_conduct_version: null,
  beamentor_submitted_at: null, beamentor_verified_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.mark.mockResolvedValue(undefined);
  state.refresh.mockResolvedValue(undefined);
  state.review.mockResolvedValue(true);
  state.updateUser.mockResolvedValue({ data: {}, error: null });
  state.meta = {};
});

test('the BeAMentor step links to BeAMentor and continues only once the box is ticked', async () => {
  // The Guest Expert Policy is already agreed.
  const { GUEST_EXPERT_POLICY } = await import('../../models/codeOfConduct');
  state.profile = { ...expert, code_of_conduct_version: GUEST_EXPERT_POLICY.version };
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/expert/beamentor']}><Routes>
    <Route path="/expert/beamentor" element={<BeAMentorPage />} />
    <Route path="/home" element={<div>Home</div>} />
  </Routes></MemoryRouter>);
  expect(screen.getByRole('link', { name: /Open BeAMentor/ })).toHaveAttribute('href', BEAMENTOR_URL);
  expect(document.body.textContent).not.toMatch(/'2[56]|Summit 2[56]/);
  const go = screen.getByRole('button', { name: 'Continue to the app' });
  expect(go).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: 'I have submitted my BeAMentor application' }));
  await user.click(go);
  expect(state.mark).toHaveBeenCalled();
  expect(await screen.findByText('Home')).toBeInTheDocument();
});

test('the waiting banner shows until verified, and the X hides it for good, on the account too', async () => {
  state.profile = { ...expert, expert_status: 'approved', beamentor_submitted_at: '2026-11-21T10:00:00Z' };
  const user = userEvent.setup();
  const { unmount } = render(<BeamentorBanner />);
  expect(screen.getByRole('status')).toHaveTextContent('waiting to be verified by a Summit organizer');
  await user.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(state.updateUser).toHaveBeenCalledWith({ data: { beamentor_banner_dismissed: true } });
  unmount();
  render(<BeamentorBanner />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('a banner closed on another device stays closed here', () => {
  state.meta = { beamentor_banner_dismissed: true };
  state.profile = { ...expert, expert_status: 'approved', beamentor_submitted_at: '2026-11-21T10:00:00Z' };
  render(<BeamentorBanner />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('verified experts see no banner', () => {
  state.profile = { ...expert, expert_status: 'approved', beamentor_submitted_at: '2026-11-21T10:00:00Z', beamentor_verified_at: '2026-11-22T10:00:00Z' };
  render(<BeamentorBanner />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('admins see not-verified experts, verify one, and find them under Verified', async () => {
  state.profile = { id: 'admin-1', role: 'admin' };
  const row = {
    userId: 'e1', fullName: 'Dr. Rivera', email: 'rivera@example.com', expertise: 'Robotics', bio: null, phone: null,
    title: 'Engineer', company: 'Acme', photoUrl: null, requestedAt: null, stage: 'not_verified',
    beamentorSubmittedAt: '2026-11-21T10:00:00Z', verifiedAt: null, verifiedByName: null,
  };
  state.dashboard.mockResolvedValue([row, { ...row, userId: 'e2', fullName: 'Pat Lee', stage: 'verified', verifiedAt: '2026-11-20T10:00:00Z' }]);
  const user = userEvent.setup();
  render(<MemoryRouter><ExpertApprovalsPage /></MemoryRouter>);
  expect(await screen.findByText('Dr. Rivera')).toBeInTheDocument();
  expect(screen.getByText('Engineer · Acme')).toBeInTheDocument();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Not verified1', 'Verified1']);
  expect(screen.queryByText('Pat Lee')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Verify/ }));
  expect(state.review).toHaveBeenCalledWith('e1', true);
  expect(screen.getByText('Every expert is verified.')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: /^Verified/ }));
  expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
  expect(screen.getByText('Pat Lee')).toBeInTheDocument();
});
