import { expect, test } from 'vitest';
import { landingTrackTitles } from '../landingTracks';

test('NovaSphere includes its confirmed Core Sciences title when only climate has a live row', () => {
  const live = [{ track: 'novasphere', title: 'Climate Change & Sustainability Presentations', time: '09:00' }];
  expect(landingTrackTitles('novasphere', live)).toEqual([
    'Core Sciences Presentations & Exhibits',
    'Climate Change & Sustainability Presentations',
  ]);
  // A public title does not become an invented registration session.
  expect(live).toHaveLength(1);
});

test('a live Core Sciences row replaces the public label without a duplicate', () => {
  const live = [
    { track: 'novasphere', title: 'Climate Change & Sustainability Presentations', time: '09:00' },
    { track: 'novasphere', title: ' Core Sciences Presentations and Exhibits ', time: '10:00' },
    { track: 'novasphere', title: 'CORE SCIENCES PRESENTATIONS & EXHIBITS', time: '11:00' },
  ];
  expect(landingTrackTitles('novasphere', live)).toEqual([
    'Core Sciences Presentations and Exhibits',
    'Climate Change & Sustainability Presentations',
  ]);
});

test('VentureVerse shows Entrepreneurship before Marketing even when Marketing starts earlier', () => {
  expect(landingTrackTitles('ventureverse', [
    { track: 'ventureverse', title: 'Marketing', time: '09:00' },
    { track: 'ventureverse', title: 'Entrepreneurship Shark Tank', time: '13:00' },
  ])).toEqual(['Entrepreneurship Shark Tank', 'Marketing']);
});

test('other live titles remain intact and in their discipline', () => {
  expect(landingTrackTitles('new-discipline', [
    { track: 'novasphere', title: 'Core Sciences Presentations & Exhibits', time: '08:00' },
    { track: 'new-discipline', title: 'A new track', time: '10:00' },
  ])).toEqual(['A new track']);
});
