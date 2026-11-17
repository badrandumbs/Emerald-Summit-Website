import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from '../LoginPage';

const auth = vi.hoisted(() => ({ send: vi.fn(), verify: vi.fn(), google: vi.fn(), isTest: vi.fn(), testSignIn: vi.fn(), needsSignUp: vi.fn(), signOut: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ session: null, profile: null, clearSignInError: vi.fn() }) }));
vi.mock('../../services/auth', () => ({ sendSignInCode: (email: string, role: string, opts?: unknown) => auth.send(email, role, opts), NoAccountError: class NoAccountError extends Error {}, verifySignInCode: (email: string, code: string) => auth.verify(email, code), signInWithGoogle: auth.google, signInWithGoogleIdToken: vi.fn(), isTestAccount: (email: string) => auth.isTest(email), signInWithTestAccount: (email: string, password: string) => auth.testSignIn(email, password), signedInAccountNeedsSignUp: () => auth.needsSignUp(), signOut: () => auth.signOut() }));
vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: true, supabase: null }));
// Google's script can't load in tests, so the page shows the redirect button.
vi.mock('../../lib/googleIdentity', () => ({ GOOGLE_WEB_CLIENT_ID: 'web', loadGoogleIdentity: async () => null, makeNonce: async () => ({ raw: 'r', hashed: 'h' }) }));
vi.mock('../../components/AuthLayout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</>, AUTH_ENTER: '', authStagger: () => ({}) }));

beforeEach(() => {
  vi.clearAllMocks();
  auth.send.mockResolvedValue(undefined);
  auth.verify.mockResolvedValue(undefined);
  auth.isTest.mockResolvedValue(false);
  auth.testSignIn.mockResolvedValue(undefined);
  auth.needsSignUp.mockResolvedValue({ needsSignUp: false, email: 'team@example.com' });
  auth.signOut.mockResolvedValue(undefined);
});

test('expert email sign-in requires a verified code and offers no LinkedIn or local approval bypass', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login/expert']}><Routes><Route path="/login/:role" element={<LoginPage />} /><Route path="/home" element={<div>Signed-in dashboard</div>} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
  expect(screen.queryByText('LinkedIn sign-in')).not.toBeInTheDocument();
  expect(screen.queryByText('Use demo mode')).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Email'), 'Expert@Example.com');
  await user.click(screen.getByRole('button', { name: 'Send sign-in code' }));
  expect(auth.send).toHaveBeenCalledWith('expert@example.com', 'expert', { createAccount: false });
  expect(auth.verify).not.toHaveBeenCalled();
  await user.type(await screen.findByLabelText('Sign-in code'), '12345678');
  await user.click(screen.getByRole('button', { name: 'Verify and sign in' }));
  expect(auth.verify).toHaveBeenCalledWith('expert@example.com', '12345678');
  expect(await screen.findByText('Signed-in dashboard')).toBeInTheDocument();
});

test('a test account types the shared password instead of getting a code', async () => {
  auth.isTest.mockResolvedValue(true);
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login/participant']}><Routes><Route path="/login/:role" element={<LoginPage />} /><Route path="/home" element={<div>Signed-in dashboard</div>} /></Routes></MemoryRouter>);
  await user.type(screen.getByLabelText('Email'), 'Admin@Test.Example');
  await user.click(screen.getByRole('button', { name: 'Send sign-in code' }));
  expect(auth.send).not.toHaveBeenCalled();
  expect(screen.getByText('admin@test.example is a test account. Enter the test account password.', { exact: false })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
  await user.type(screen.getByLabelText('Password'), 'shared');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(auth.testSignIn).toHaveBeenCalledWith('admin@test.example', 'shared');
  expect(await screen.findByText('Signed-in dashboard')).toBeInTheDocument();
});

test('use a different email leaves the password step', async () => {
  auth.isTest.mockResolvedValue(true);
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login/participant']}><Routes><Route path="/login/:role" element={<LoginPage />} /></Routes></MemoryRouter>);
  await user.type(screen.getByLabelText('Email'), 'admin@test.example');
  await user.click(screen.getByRole('button', { name: 'Send sign-in code' }));
  await user.click(screen.getByRole('button', { name: 'Use a different email' }));
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toBeEnabled();
});

test('sign up creates the account; sign in to an unknown email offers sign up instead', async () => {
  const user = userEvent.setup();
  const { NoAccountError } = await import('../../services/auth');
  auth.send.mockImplementation(async (_e: string, _r: string, opts: { createAccount: boolean }) => {
    if (!opts.createAccount) throw new NoAccountError();
  });
  render(<MemoryRouter initialEntries={['/login/participant']}><Routes><Route path="/login/:role" element={<LoginPage />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Sign in as Participant' })).toBeInTheDocument();
  await user.type(screen.getByLabelText('Email'), 'new@example.com');
  await user.click(screen.getByRole('button', { name: 'Send sign-in code' }));
  expect(auth.send).toHaveBeenLastCalledWith('new@example.com', 'participant', { createAccount: false });
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('No account found');
  expect(alert).toHaveTextContent('Press Continue to enter some information and create your Participant account.');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(auth.send).toHaveBeenLastCalledWith('new@example.com', 'participant', { createAccount: true });
  expect(await screen.findByLabelText('Sign-in code')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Sign up as Participant' })).toBeInTheDocument();
});

test('organizer sign in is for admins and test accounts and may create an allowlisted admin', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/login/admin?mode=signup']}><Routes><Route path="/login/:role" element={<LoginPage />} /></Routes></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Organizer sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sign up' })).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Email'), 'admin@example.com');
  await user.click(screen.getByRole('button', { name: 'Send sign-in code' }));
  expect(auth.send).toHaveBeenLastCalledWith('admin@example.com', 'admin', { createAccount: true });
});

const renderLogin = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login/:role" element={<LoginPage />} />
      <Route path="/home" element={<p>Home page</p>} />
    </Routes>
  </MemoryRouter>,
);

async function signInWithCode(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'half@example.com');
  await user.click(screen.getByRole('button', { name: 'Send sign-in code' }));
  await user.type(await screen.findByLabelText('Sign-in code'), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify and sign in' }));
}

test('sign in to an account that never finished sign-up signs out and points to sign up', async () => {
  auth.needsSignUp.mockResolvedValue({ needsSignUp: true, email: 'half@example.com' });
  const user = userEvent.setup();
  renderLogin('/login/participant');
  await signInWithCode(user);
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent("Couldn't sign you in");
  expect(alert).toHaveTextContent('half@example.com');
  expect(auth.signOut).toHaveBeenCalled();
  expect(screen.queryByText('Home page')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Go to sign up' }));
  expect(screen.getByRole('heading', { name: 'Sign up as Participant' })).toBeInTheDocument();
});

test('sign in to a finished account goes Home', async () => {
  const user = userEvent.setup();
  renderLogin('/login/participant');
  await signInWithCode(user);
  expect(await screen.findByText('Home page')).toBeInTheDocument();
  expect(auth.signOut).not.toHaveBeenCalled();
});

test('sign up skips the check and goes on to the sign-up questions', async () => {
  const user = userEvent.setup();
  renderLogin('/login/participant?mode=signup');
  await signInWithCode(user);
  expect(await screen.findByText('Home page')).toBeInTheDocument();
  expect(auth.needsSignUp).not.toHaveBeenCalled();
});
