import { describe, expect, test } from 'vitest';
import { changeFromPayload } from '../announcements';

const row = {
  id: 'a1', title: 'Parking', body: 'Use lot B.', audience: 'Everyone', pinned: false,
  created_by: 'u1', author: 'Admin', discipline_id: null, target_user_id: null,
  attachments: null, created_at: '2026-11-22T18:00:00Z',
};

describe('changeFromPayload', () => {
  test('an insert with the whole row becomes an upsert', () => {
    const change = changeFromPayload({ eventType: 'INSERT', new: row, old: {}, errors: null });
    expect(change?.type).toBe('upsert');
    if (change?.type === 'upsert') {
      expect(change.announcement).toMatchObject({ id: 'a1', title: 'Parking', authorId: 'u1', createdAt: row.created_at });
    }
  });

  test('an edit is an upsert too', () => {
    expect(changeFromPayload({ eventType: 'UPDATE', new: { ...row, title: 'Parking moved' }, old: { id: 'a1' } }))
      .toMatchObject({ type: 'upsert', announcement: { title: 'Parking moved' } });
  });

  test('a delete carries only the id', () => {
    expect(changeFromPayload({ eventType: 'DELETE', new: {}, old: { id: 'a1' } })).toEqual({ type: 'delete', id: 'a1' });
  });

  test('a message Realtime cut short means reload', () => {
    expect(changeFromPayload({ eventType: 'INSERT', new: { id: 'a1' }, errors: ['Error 413: Payload Too Large'] })).toBeUndefined();
    expect(changeFromPayload({ eventType: 'INSERT', new: { id: 'a1', created_at: row.created_at } })).toBeUndefined();
    expect(changeFromPayload({ eventType: 'DELETE', old: {} })).toBeUndefined();
  });
});
