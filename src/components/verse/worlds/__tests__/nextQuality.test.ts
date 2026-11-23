import { expect, test } from 'vitest';
import { nextQuality } from '../engine';

test('slow frames lower the render scale to the floor, then throttle the panels', () => {
  let s = { quality: 1, throttle: false };
  for (let i = 0; i < 10; i++) s = nextQuality(s.quality, s.throttle, 1 / 30);
  expect(s).toEqual({ quality: 0.5, throttle: true });
});

test('quick frames lift the throttle first, then creep back to full scale', () => {
  let s = nextQuality(0.5, true, 1 / 60);
  expect(s).toEqual({ quality: 0.5, throttle: false });
  for (let i = 0; i < 20; i++) s = nextQuality(s.quality, s.throttle, 1 / 60);
  expect(s).toEqual({ quality: 1, throttle: false });
});

test('in between, nothing changes', () => {
  expect(nextQuality(0.75, false, 1 / 50)).toEqual({ quality: 0.75, throttle: false });
});
