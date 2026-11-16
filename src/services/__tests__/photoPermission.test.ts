import { expect, test } from 'vitest';
import { photoPermissionFrom } from '../photoPermission';

test('a row reads granted, not granted and not answered', () => {
  const row = (consent: unknown) => photoPermissionFrom({
    user_id: 'u1', full_name: 'Sam Lee', email: 'sam@example.com', role: 'participant', school: ' ', photo_consent: consent,
  });
  expect(row(true).granted).toBe(true);
  expect(row(false).granted).toBe(false);
  expect(row(null).granted).toBeNull();
  expect(row(null).school).toBeNull();
  expect(row(null).name).toBe('Sam Lee');
});
