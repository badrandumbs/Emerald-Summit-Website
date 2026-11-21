import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfileSetupPage from '../ProfileSetupPage';
import { CODE_OF_CONDUCT, GUEST_EXPERT_POLICY } from '../../models/codeOfConduct';

const state = vi.hoisted(() => ({
  role: 'volunteer',
  onboarding: true,
  // Whether the profile row has the Code of Conduct columns, and its value.
  conduct: undefined as undefined | { code_of_conduct_version: string | null },
  save: vi.fn(),
  refresh: vi.fn(),
  agree: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({
  session: { user: { id: 'user-1', email: 'team@example.com', user_metadata: {} } },
  profile: {
    id: 'user-1', name: 'Summit Team', email: 'team@example.com', role: state.role,
    profile_setup_complete: !state.onboarding, ...state.conduct,
  },
  loadingProfile: false,
  refreshProfile: state.refresh,
}) }));
vi.mock('../../components/AuthLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</>, AUTH_ENTER: '', authStagger: () => ({}) }));
vi.mock('../../services/auth', () => ({
  needsProfileSetup: () => state.onboarding,
  saveProfileDetails: (...args: unknown[]) => state.save(...args),
  agreeToCodeOfConduct: (...args: unknown[]) => state.agree(...args),
  signOut: vi.fn(),
}));

// The signature pad watches its size; jsdom has no
// ResizeObserver.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
// jsdom has no canvas; the pad still counts a stroke without one.
vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

function sign() {
  const pad = screen.getByRole('img', { name: /Signature pad/ });
  fireEvent.pointerDown(pad);
  fireEvent.pointerUp(pad);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.onboarding = true;
  state.conduct = undefined;
  state.agree.mockResolvedValue(undefined);
  state.save.mockResolvedValue(undefined);
  state.refresh.mockResolvedValue(undefined);
});

test.each([
  ['volunteer', 'Your phone number will be visible to other volunteers the day of for communication with them.'],
  ['admin', 'Your phone number will be visible to volunteers and other organizers the day of for communication with them.'],
])('%s sign-up requires a mobile number and says who sees it', async (role, note) => {
  state.role = role;
  const user = userEvent.setup();
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  const phone = screen.getByLabelText('Mobile number');
  expect(phone).toBeRequired();
  expect(phone).toHaveAccessibleDescription(note);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Mobile number is required.');
  expect(state.save).not.toHaveBeenCalled();
  await user.type(phone, '5551234567');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(state.save).toHaveBeenCalledWith('Summit Team', expect.objectContaining({ phone: '5551234567' }), true);
});

test('participants pick a school and give a grade; the phone is optional', async () => {
  state.role = 'participant';
  const user = userEvent.setup();
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByLabelText(/Mobile number/)).not.toBeRequired();
  // No school is filled in for them.
  expect(screen.getByLabelText('School')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please answer "School".');
  await user.selectOptions(screen.getByLabelText('School'), 'Dublin High School');
  await user.selectOptions(screen.getByLabelText('Grade'), '11th grade');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(state.save).toHaveBeenCalledWith('Summit Team', { school: 'Dublin High School', grade: '11', phone: '' }, true);
});

test('experts give their area of expertise and a one-line bio', () => {
  state.role = 'expert';
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByLabelText('Area of expertise')).toBeRequired();
  expect(screen.getByLabelText('One-line bio')).toBeRequired();
});

test('the grade question says middle schoolers come with an adult', () => {
  state.role = 'participant';
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByLabelText('Grade')).toHaveAccessibleDescription(
    '8th graders can participate in some tracks and spectate any of them. Middle schoolers must come with an adult.',
  );
});

test('spectators are told all ages are welcome, with a parent for middle schoolers', () => {
  state.role = 'attendee';
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByText('Curious minds of all ages are welcome. Middle schoolers and younger need a parent with them.')).toBeInTheDocument();
});

test('the grade is a dropdown of 8th to 12th grade', () => {
  state.role = 'participant';
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  const options = [...(screen.getByLabelText('Grade') as HTMLSelectElement).options]
    .filter((o) => o.value !== '')
    .map((o) => o.textContent);
  expect(options).toEqual(['8th grade', '9th grade', '10th grade', '11th grade', '12th grade']);
});

test('sign-up ends with the Code of Conduct box, once the columns exist', async () => {
  state.role = 'attendee';
  state.conduct = { code_of_conduct_version: null };
  const user = userEvent.setup();
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  const continueButton = screen.getByRole('button', { name: 'Continue' });
  expect(continueButton).toBeDisabled();
  // The photo question is asked once, as the radio, not again in the window.
  expect(screen.queryByText(/___/)).toBeNull();
  expect(screen.getAllByText(CODE_OF_CONDUCT.mediaChoice!.grant)).toHaveLength(1);
  // Signing is the agreement: there is no checkbox.
  expect(screen.queryByRole('checkbox')).toBeNull();
  // The photo permission question has to be answered too.
  expect(continueButton).toBeDisabled();
  await user.click(screen.getByRole('radio', { name: CODE_OF_CONDUCT.mediaChoice!.grant }));
  // And it stays blocked until they sign; Clear blocks it again.
  expect(continueButton).toBeDisabled();
  sign();
  expect(continueButton).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(continueButton).toBeDisabled();
  sign();
  await user.click(continueButton);
  expect(state.save).toHaveBeenCalled();
  expect(state.agree).toHaveBeenCalledWith(CODE_OF_CONDUCT.version, true);
});

test('no Code of Conduct box before the SQL adds the columns', () => {
  state.role = 'attendee';
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.queryByRole('img', { name: /Signature pad/ })).toBeNull();
});

test('an existing expert who has not agreed sees only the Guest Expert Policy', async () => {
  state.role = 'expert';
  state.onboarding = false;
  state.conduct = { code_of_conduct_version: null };
  const user = userEvent.setup();
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByText('One last step')).toBeInTheDocument();
  expect(screen.queryByLabelText('Area of expertise')).toBeNull();
  expect(screen.getAllByText(GUEST_EXPERT_POLICY.title).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Agree and continue' })).toBeDisabled();
  sign();
  await user.click(screen.getByRole('button', { name: 'Agree and continue' }));
  expect(screen.queryByRole('radio')).toBeNull();
  expect(state.agree).toHaveBeenCalledWith(GUEST_EXPERT_POLICY.version, null);
  expect(state.save).not.toHaveBeenCalled();
});
