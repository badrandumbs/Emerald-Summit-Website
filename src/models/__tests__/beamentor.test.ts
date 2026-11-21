import { expect, test } from 'vitest';
import { awaitingBeamentorVerification, needsBeamentor, tracksBeamentor } from '../beamentor';

const expert = { role: 'expert', profile_setup_complete: true, beamentor_submitted_at: null, beamentor_verified_at: null };

test('nobody is asked until the SQL adds the columns', () => {
  const { beamentor_submitted_at: _s, beamentor_verified_at: _v, ...old } = expert;
  expect(tracksBeamentor(old)).toBe(false);
  expect(needsBeamentor(old)).toBe(false);
});

test('a signed-up expert who has not ticked the box is sent to the BeAMentor step', () => {
  expect(needsBeamentor(expert)).toBe(true);
  expect(needsBeamentor({ ...expert, profile_setup_complete: false })).toBe(false);
  expect(needsBeamentor({ ...expert, role: 'participant' })).toBe(false);
});

test('after ticking, the expert waits for an organizer; verifying ends the wait', () => {
  const submitted = { ...expert, beamentor_submitted_at: '2026-11-21T10:00:00Z' };
  expect(needsBeamentor(submitted)).toBe(false);
  expect(awaitingBeamentorVerification(submitted)).toBe(true);
  const verified = { ...submitted, beamentor_verified_at: '2026-11-22T10:00:00Z' };
  expect(awaitingBeamentorVerification(verified)).toBe(false);
});

test('an expert an organizer verified before they ticked the box skips the step', () => {
  expect(needsBeamentor({ ...expert, beamentor_verified_at: '2026-11-22T10:00:00Z' })).toBe(false);
});
