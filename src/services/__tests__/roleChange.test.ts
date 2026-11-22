import { describe, test, expect, beforeEach, vi } from 'vitest';

const { backend, db } = vi.hoisted(() => {
  const db = { keptRole: null as string | null, preview: [] as unknown[], updates: [] as unknown[], email: undefined as string | undefined, allowlist: 'none' as 'none' | 'listed' | 'error' };
  const backend = {
    rpc: vi.fn(async () => ({ data: db.preview, error: null })),
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: db.email } } } }) },
    from: (table: string) => {
      if (table === 'role_allowlist') {
        const a: any = { select: () => a, eq: () => a, maybeSingle: async () => (db.allowlist === 'error'
          ? { data: null, error: new Error('offline') }
          : { data: db.allowlist === 'listed' ? { email: db.email } : null, error: null }) };
        return a;
      }
      let payload: Record<string, unknown> = {};
      const b: any = {
        update: (p: Record<string, unknown>) => { payload = p; db.updates.push(p); return b; },
        eq: () => b,
        select: () => b,
        single: async () => ({ data: { id: 'me', role: db.keptRole ?? payload.role, details: {}, onboarded: true }, error: null }),
      };
      return b;
    },
  };
  return { backend, db };
});
vi.mock('../../lib/supabase', () => ({ supabase: backend, isSupabaseConfigured: true }));

const rc = await import('../roleChange');

beforeEach(() => {
  db.keptRole = null;
  db.updates = [];
  db.email = undefined;
  db.allowlist = 'none';
  backend.rpc.mockClear();
});

describe('role change', () => {
  test('previews with the stored role id and reads each change', async () => {
    db.preview = [{ session_id: 's1', title: 'CADathon', from: 'participant', to: 'spectator', team: { action: 'deleted', project_name: 'Bots', code: 'AB12' } }];
    const items = await rc.previewRoleChange('attendee');
    expect(backend.rpc).toHaveBeenCalledWith('preview_role_change', { p_role: 'parentSpectator' });
    expect(rc.describeRoleChange(items[0])).toBe(
      '"CADathon": you\'ll go from participating to spectating. Nobody else has joined your team "Bots", so it will be deleted and its code AB12 will stop working.',
    );
    expect(rc.roleChangeLeadIn('attendee', 'Attendee')).toBe('As a Attendee, you can only spectate. These tracks change:');
  });

  test('managing lines match the app', () => {
    const base = { sessionId: 's', title: 'Expo', team: null };
    expect(rc.describeRoleChange({ ...base, from: 'managing', to: 'dropped' })).toBe('"Expo": you\'ll stop managing it. It\'s full, so it will be removed from your day.');
    expect(rc.describeRoleChange({ ...base, from: 'expert', to: 'spectator' })).toBe('"Expo": you\'ll go from serving as an expert to spectating.');
  });

  test('saves the role and refuses when the server keeps another one', async () => {
    expect((await rc.changeRole('expert')).role).toBe('expert');
    expect(db.updates[0]).toMatchObject({ role: 'expert' });
    db.keptRole = 'participant';
    await expect(rc.changeRole('admin')).rejects.toThrow(/not on the list of people allowed to be an organizer. Please email support@ehsacademics.org/);
  });

  test('says to try again when the list cannot be read, and to email support when not on it', async () => {
    db.email = 'me@example.com';
    db.allowlist = 'error';
    await expect(rc.checkRoleEligible('volunteer')).rejects.toThrow(
      "Couldn't check the list. Try again. If this keeps happening, please email support@ehsacademics.org.");
    db.allowlist = 'none';
    await expect(rc.checkRoleEligible('volunteer')).rejects.toThrow(
      'Your email is not on the list of people allowed to be a volunteer. Please email support@ehsacademics.org.');
    db.allowlist = 'listed';
    await expect(rc.checkRoleEligible('volunteer')).resolves.toBeUndefined();
  });
});
