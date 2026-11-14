import { expect, test } from 'vitest';
import { SESSION_ROOMS_ENABLED, sessionPlace } from '../sessions';

test('lists show "Room TBD" while rooms are locked', () => {
  expect(SESSION_ROOMS_ENABLED).toBe(false);
  expect(sessionPlace({ location: 'Gym' })).toBe('Room TBD');
  expect(sessionPlace({ location: '' })).toBe('Room TBD');
});
