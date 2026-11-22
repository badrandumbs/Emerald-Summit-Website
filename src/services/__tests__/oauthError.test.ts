import { test, expect, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

const { takeOAuthError } = await import('../auth');

test('a failed Google or LinkedIn return shows its reason and is removed from the address bar', () => {
  localStorage.setItem('pending_user_role', 'participant');
  window.history.replaceState(null, '', '/home?error=server_error&error_description=Unable+to+exchange+external+code&keep=1#error=server_error&error_description=Unable%20to%20exchange');
  expect(takeOAuthError()).toBe("Sign-in didn't finish (Unable to exchange external code). Try again, or use your email.");
  expect(window.location.pathname + window.location.search + window.location.hash).toBe('/home?keep=1');
  expect(localStorage.getItem('pending_user_role')).toBeNull();
});

test('a normal address has no error', () => {
  window.history.replaceState(null, '', '/home');
  expect(takeOAuthError()).toBeNull();
});

test('connecting a LinkedIn account that another Summit account uses says so', () => {
  window.history.replaceState(null, '', '/account/edit?error=server_error&error_description=Identity+is+already+linked+to+another+user');
  expect(takeOAuthError()).toMatch(/already used by another Summit account/);
  expect(window.location.search).toBe('');
});
