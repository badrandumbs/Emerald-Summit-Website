import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileSetupPage from '../ProfileSetupPage';
import { CODE_OF_CONDUCT, GUEST_EXPERT_POLICY } from '../../models/codeOfConduct';

const state = vi.hoisted(() => ({
  role: 'volunteer',
  onboarding: true,
  // Whether the profile row has the Code of Conduct columns, and its value.
  conduct: undefined as undefined | { code_of_conduct_version: string | null },
  details: {} as Record<string, string>,
  // Other profile columns, e.g. BeAMentor's.
  extra: {} as Record<string, unknown>,
  save: vi.fn(),
  refresh: vi.fn(),
  agree: vi.fn(),
  changeRole: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({
  session: { user: { id: 'user-1', email: 'team@example.com', user_metadata: {} } },
  profile: {
    id: 'user-1', name: 'Summit Team', email: 'team@example.com', role: state.role,
    profile_setup_complete: !state.onboarding, details: state.details, ...state.conduct, ...state.extra,
  },
  loadingProfile: false,
  refreshProfile: state.refresh,
}) }));
vi.mock('../../services/roleChange', () => ({
  changeRole: (role: string) => state.changeRole(role),
  roleChangedPath: (role: string) => `/profile?changed=${role}`,
}));
vi.mock('../../components/ExpertPhotoInput', () => ({ default: () => <p>Headshot</p> }));
vi.mock('../../components/AuthLayout', () => ({
  default: ({ children, backLabel, onBack }: { children: ReactNode; backLabel: string; onBack: () => void }) => (
    <><button type="button" onClick={onBack}>{backLabel}</button>{children}</>
  ),
  AUTH_ENTER: '',
  authStagger: () => ({}),
}));
vi.mock('../../services/auth', () => ({
  needsProfileSetup: () => state.onboarding,
  saveProfileDetails: (...args: unknown[]) => state.save(...args),
  agreeToCodeOfConduct: (...args: unknown[]) => state.agree(...args),
  signOut: vi.fn(),
}));

// The Code of Conduct checkbox (Radix) measures itself; jsdom has no
// ResizeObserver.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

beforeEach(() => {
  vi.clearAllMocks();
  state.onboarding = true;
  state.conduct = undefined;
  state.details = {};
  state.extra = {};
  state.agree.mockResolvedValue(undefined);
  state.save.mockResolvedValue(undefined);
  state.changeRole.mockResolvedValue({ role: 'expert' });
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

test('a school typed in Other must be a real name', async () => {
  state.role = 'participant';
  const user = userEvent.setup();
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  await user.selectOptions(screen.getByLabelText('School'), 'Other (not listed)');
  await user.type(screen.getByLabelText('School name'), '.');
  await user.selectOptions(screen.getByLabelText('Grade'), '11th grade');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('alert')).toHaveTextContent("Type your school's full name.");
  expect(state.save).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('School name'));
  await user.type(screen.getByLabelText('School name'), 'Harker School');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(state.save).toHaveBeenCalledWith('Summit Team', expect.objectContaining({ school: 'Harker School' }), true);
});

test('a finished participant with no real school is asked for just the school', async () => {
  state.role = 'participant';
  state.onboarding = false;
  state.conduct = { code_of_conduct_version: CODE_OF_CONDUCT.version };
  state.details = { school: '.', grade: '11' };
  const user = userEvent.setup();
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Add your school' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Grade')).toBeNull();
  await user.selectOptions(screen.getByLabelText('School'), 'Dublin High School');
  await user.click(screen.getByRole('button', { name: 'Save and continue' }));
  expect(state.save).toHaveBeenCalledWith('Summit Team', { school: 'Dublin High School' }, false);
});

test('experts give their title, company, area of expertise and a short bio', () => {
  state.role = 'expert';
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByLabelText('Job title')).toBeRequired();
  expect(screen.getByLabelText('Company or organization')).toBeRequired();
  expect(screen.getByLabelText('Area of expertise')).toBeRequired();
  expect(screen.getByLabelText('Short bio')).toBeRequired();
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
  // No signature pad: ticking the box is the agreement.
  expect(screen.queryByRole('img', { name: /Signature pad/ })).toBeNull();
  // The photo question comes after the Code of Conduct and its box.
  const conductBox = screen.getByRole('checkbox', { name: CODE_OF_CONDUCT.checkbox });
  const grantRadio = screen.getByRole('radio', { name: CODE_OF_CONDUCT.mediaChoice!.grant });
  expect(conductBox.compareDocumentPosition(grantRadio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await user.click(screen.getByRole('checkbox', { name: CODE_OF_CONDUCT.checkbox }));
  // The photo permission question has to be answered too.
  expect(continueButton).toBeDisabled();
  await user.click(screen.getByRole('radio', { name: CODE_OF_CONDUCT.mediaChoice!.grant }));
  expect(continueButton).toBeEnabled();
  // Unticking blocks it again.
  await user.click(screen.getByRole('checkbox', { name: CODE_OF_CONDUCT.checkbox }));
  expect(continueButton).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: CODE_OF_CONDUCT.checkbox }));
  await user.click(continueButton);
  expect(state.save).toHaveBeenCalled();
  expect(state.agree).toHaveBeenCalledWith(CODE_OF_CONDUCT.version, true);
});

test('no Code of Conduct box before the SQL adds the columns', () => {
  state.role = 'attendee';
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.queryByRole('checkbox', { name: CODE_OF_CONDUCT.checkbox })).toBeNull();
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
  await user.click(screen.getByRole('checkbox', { name: GUEST_EXPERT_POLICY.checkbox }));
  await user.click(screen.getByRole('button', { name: 'Agree and continue' }));
  expect(screen.queryByRole('radio')).toBeNull();
  expect(state.agree).toHaveBeenCalledWith(GUEST_EXPERT_POLICY.version, null);
  expect(state.save).not.toHaveBeenCalled();
});

const BEAMENTOR_DUE = { beamentor_submitted_at: null, beamentor_verified_at: null };

test('an existing expert with BeAMentor still to do is not told the policy is the last step', () => {
  state.role = 'expert';
  state.onboarding = false;
  state.conduct = { code_of_conduct_version: null };
  state.extra = BEAMENTOR_DUE;
  render(<MemoryRouter><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByText('One more step')).toBeInTheDocument();
  expect(screen.queryByText('One last step')).toBeNull();
});

test('switching to expert asks for the headshot and the Guest Expert Policy on one page', async () => {
  // Nothing is saved before this page: they are still a participant.
  state.role = 'participant';
  state.onboarding = false;
  // They agreed to the Code of Conduct as a participant.
  state.conduct = { code_of_conduct_version: CODE_OF_CONDUCT.version };
  state.extra = BEAMENTOR_DUE;
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/profile?changed=expert']}><ProfileSetupPage /></MemoryRouter>);
  expect(screen.getByText(/^Your details as an? /)).toBeInTheDocument();
  expect(screen.getByText('Headshot')).toBeInTheDocument();
  expect(screen.queryByText('One last step')).toBeNull();
  const continueButton = screen.getByRole('button', { name: 'Continue' });
  expect(continueButton).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: GUEST_EXPERT_POLICY.checkbox }));
  for (const f of screen.queryAllByRole('textbox')) {
    if ((f as HTMLInputElement).required && !(f as HTMLInputElement).value) await user.type(f, 'Robotics');
  }
  await user.click(continueButton);
  expect(state.changeRole).toHaveBeenCalledWith('expert');
  expect(state.changeRole.mock.invocationCallOrder[0]).toBeLessThan(state.save.mock.invocationCallOrder[0]);
  expect(state.save).toHaveBeenCalledWith('Summit Team', expect.any(Object), false);
  expect(state.agree).toHaveBeenCalledWith(GUEST_EXPERT_POLICY.version, null);
});

test('Back after Change role goes back to where they were, with nothing changed', async () => {
  state.role = 'participant';
  state.onboarding = false;
  state.conduct = { code_of_conduct_version: CODE_OF_CONDUCT.version };
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[{ pathname: '/profile', search: '?changed=expert', state: { from: '/settings' } }]}>
      <Routes>
        <Route path="/profile" element={<ProfileSetupPage />} />
        <Route path="/settings" element={<p>Settings page</p>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.queryByRole('button', { name: /Sign out/ })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByText('Settings page')).toBeInTheDocument();
  expect(state.changeRole).not.toHaveBeenCalled();
  expect(state.save).not.toHaveBeenCalled();
});

test('a role the switch refuses shows why and saves nothing else', async () => {
  state.role = 'participant';
  state.onboarding = false;
  state.changeRole.mockRejectedValue(new Error('You are not eligible to sign up as a volunteer.'));
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/profile?changed=attendee']}><ProfileSetupPage /></MemoryRouter>);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('alert')).toHaveTextContent('You are not eligible to sign up as a volunteer.');
  expect(state.save).not.toHaveBeenCalled();
});
