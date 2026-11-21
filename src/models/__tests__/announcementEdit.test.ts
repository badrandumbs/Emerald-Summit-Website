import { describe, expect, test } from 'vitest';
import { canEditAnnouncement, type Announcement } from '../announcements';

const post = (over: Partial<Announcement> = {}): Announcement => ({
  id: 'p1',
  title: 'Lab coats',
  body: 'Bring one.',
  category: 'General',
  date: 'Nov 20',
  pinned: false,
  author: 'Organizer',
  audience: 'BioSphere',
  authorId: 'vol-1',
  disciplineId: 'biosphere',
  ...over,
});

const organizer = { id: 'vol-1', role: 'volunteer', can_post_announcements: true, managed_disciplines: ['biosphere'] };
const admin = { id: 'admin-1', role: 'admin' };

describe('canEditAnnouncement', () => {
  test('a track organizer edits their own post to a track they manage', () => {
    expect(canEditAnnouncement(post(), organizer)).toBe(true);
  });

  test('not someone else’s post, even as an admin', () => {
    expect(canEditAnnouncement(post(), { ...organizer, id: 'vol-2' })).toBe(false);
    expect(canEditAnnouncement(post(), admin)).toBe(false);
  });

  test('admins edit their own posts, Everyone included', () => {
    expect(canEditAnnouncement(post({ authorId: 'admin-1', disciplineId: undefined, audience: 'Everyone' }), admin)).toBe(true);
  });

  test('not after losing posting rights or the track', () => {
    expect(canEditAnnouncement(post(), { ...organizer, can_post_announcements: false })).toBe(false);
    expect(canEditAnnouncement(post(), { ...organizer, managed_disciplines: ['techverse'] })).toBe(false);
  });

  test('never a personal notice, and never signed out', () => {
    expect(canEditAnnouncement(post({ authorId: 'admin-1', targetUserId: 'u1' }), admin)).toBe(false);
    expect(canEditAnnouncement(post(), null)).toBe(false);
  });
});
