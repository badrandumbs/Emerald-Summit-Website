import { expect, test } from 'vitest';
import { landingTrackTitles, techVerseTrackColumns, techVerseTrackRows } from '../landingTracks';

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


test('TechVerse groups computer science and engineering titles without losing unfamiliar tracks', () => {
  const sessions = [
    { track: 'techverse', title: 'Engineering Presentations', time: '09:00' },
    { track: 'techverse', title: 'Computer Science Exhibits', time: '08:00' },
    { track: 'techverse', title: 'Comp Sci Presentations', time: '13:00' },
    { track: 'techverse', title: 'CADathon', time: '10:00' },
    { track: 'techverse', title: 'Robothon: Build and Program', time: '11:00' },
    { track: 'techverse', title: 'AI Playground', time: '12:00' },
    { track: 'techverse', title: 'Designing a compiler', time: '14:00', trackName: 'Computer Science' },
    { track: 'techverse', title: 'A new track', time: '15:00' },
    { track: 'novasphere', title: 'Core Sciences Presentations & Exhibits', time: '09:00' },
  ];
  const original = structuredClone(sessions);
  const grouped = techVerseTrackColumns(sessions);
  expect(grouped.computerScience).toEqual([
    'Computer Science Exhibits', 'AI Playground', 'Comp Sci Presentations', 'Designing a compiler',
  ]);
  expect(grouped.engineering).toEqual([
    'Engineering Presentations', 'CADathon', 'Robothon: Build and Program',
  ]);
  expect(grouped.other).toEqual(['A new track']);
  expect(sessions).toEqual(original);
});

test('TechVerse presentations and exhibits align by format instead of start time', () => {
  expect(techVerseTrackRows({
    computerScience: ['Computer Science Exhibits', 'Computer Science Presentations', 'AI Playground'],
    engineering: ['Engineering Presentations', 'Engineering Exhibits', 'Robothon'],
    other: [],
  })).toEqual([
    { computerScience: 'Computer Science Presentations', engineering: 'Engineering Presentations' },
    { computerScience: 'Computer Science Exhibits', engineering: 'Engineering Exhibits' },
    { computerScience: 'AI Playground', engineering: 'Robothon' },
  ]);
});

test('a missing presentation counterpart does not pull an exhibit into its row', () => {
  expect(techVerseTrackRows({
    computerScience: ['Computer Science Exhibits'],
    engineering: ['Engineering Presentations', 'Engineering Exhibits'],
    other: [],
  })).toEqual([
    { computerScience: undefined, engineering: 'Engineering Presentations' },
    { computerScience: 'Computer Science Exhibits', engineering: 'Engineering Exhibits' },
  ]);
});
