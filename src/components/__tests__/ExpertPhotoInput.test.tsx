import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExpertPhotoInput from '../ExpertPhotoInput';
import { linkedInDetails } from '../../services/auth';

const state = vi.hoisted(() => ({
  user: { id: 'u1', identities: [] as unknown[] } as Record<string, unknown>,
  importPhoto: vi.fn(),
  connect: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({
  session: { user: state.user }, signInError: null, clearSignInError: vi.fn(),
}) }));
vi.mock('../../services/auth', async (orig) => ({
  ...(await orig<typeof import('../../services/auth')>()),
  importLinkedInPhoto: (url: string) => state.importPhoto(url),
  connectLinkedIn: (path: string) => state.connect(path),
}));
vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

const linked = (data: Record<string, unknown>) => ({ id: 'u1', identities: [{ provider: 'linkedin_oidc', identity_data: data }] });

beforeEach(() => {
  vi.clearAllMocks();
  state.importPhoto.mockResolvedValue('https://storage/expert_photos/u1/photo.jpg');
  state.connect.mockResolvedValue(undefined);
});

test('LinkedIn details come from the connected LinkedIn identity', () => {
  expect(linkedInDetails(linked({ name: 'Dr. Rivera', picture: 'https://media.licdn.com/p.jpg' }) as never))
    .toEqual({ name: 'Dr. Rivera', photoUrl: 'https://media.licdn.com/p.jpg' });
  expect(linkedInDetails(linked({ given_name: 'Pat', family_name: 'Lee' }) as never)).toEqual({ name: 'Pat Lee', photoUrl: null });
  expect(linkedInDetails({ id: 'u1', identities: [{ provider: 'google', identity_data: {} }] } as never)).toBeNull();
});

test('on sign-up the LinkedIn photo is copied in by itself', async () => {
  state.user = linked({ picture: 'https://media.licdn.com/p.jpg' });
  const onChange = vi.fn();
  render(<ExpertPhotoInput value="" onChange={onChange} returnPath="/profile" autoImport />);
  await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://storage/expert_photos/u1/photo.jpg'));
  expect(state.importPhoto).toHaveBeenCalledWith('https://media.licdn.com/p.jpg');
  expect(screen.queryByRole('button', { name: /Connect LinkedIn/ })).not.toBeInTheDocument();
});

test('an existing photo is not replaced, but Use LinkedIn photo is there', async () => {
  state.user = linked({ picture: 'https://media.licdn.com/p.jpg' });
  const onChange = vi.fn();
  render(<ExpertPhotoInput value="https://storage/old.jpg" onChange={onChange} returnPath="/profile" autoImport />);
  expect(state.importPhoto).not.toHaveBeenCalled();
  await userEvent.setup().click(screen.getByRole('button', { name: /Use LinkedIn photo/ }));
  expect(state.importPhoto).toHaveBeenCalled();
});

test('without LinkedIn, Connect LinkedIn comes back to the same page', async () => {
  state.user = { id: 'u1', identities: [{ provider: 'google', identity_data: {} }] };
  render(<ExpertPhotoInput value="" onChange={vi.fn()} returnPath="/account/edit" />);
  await userEvent.setup().click(screen.getByRole('button', { name: /Connect LinkedIn/ }));
  expect(state.connect).toHaveBeenCalledWith('/account/edit');
});
