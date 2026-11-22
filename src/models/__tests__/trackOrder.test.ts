import { expect, test } from 'vitest';
import { orderTracks } from '../trackOrder';

const t = (title: string, time: string) => ({ title, time });

test('TechVerse lists computer science, then the other tech tracks, then engineering, by time within each', () => {
  const live = [
    t('Product Design', '09:30'),
    t('Computer Science Presentations', '09:30'),
    t('Engineering Presentations', '09:30'),
    t('Computer Science Exhibits', '10:00'),
    t('AI Playground', '11:00'),
    t('CADathon Workshop', '13:30'),
    t('Engineering Exhibits', '14:00'),
  ];
  expect(orderTracks('techverse', live).map((x) => x.title)).toEqual([
    'Computer Science Presentations',
    'Computer Science Exhibits',
    'Product Design',
    'AI Playground',
    'Engineering Presentations',
    'CADathon Workshop',
    'Engineering Exhibits',
  ]);
});

test('follows each description, and puts unmatched or untimed tracks last', () => {
  const venture = [t('Marketing', '09:30'), t('Entrepreneurship Shark Tank', '10:00')];
  expect(orderTracks('ventureverse', venture).map((x) => x.title)).toEqual(['Entrepreneurship Shark Tank', 'Marketing']);
  const imagine = [t('Drama + Improv', '09:30'), t('Music', '09:30'), t('Art and Literature Gallery', '09:30')];
  expect(orderTracks('imaginex', imagine).map((x) => x.title)).toEqual(['Art and Literature Gallery', 'Music', 'Drama + Improv']);
  const civic = [t('Something New', '08:00'), t('Mock Trial', 'TBD'), t('Mock Trial Finals', '09:00')];
  expect(orderTracks('civicverse', civic).map((x) => x.title)).toEqual(['Mock Trial Finals', 'Mock Trial', 'Something New']);
});

test('matches at the start of a word, and the longest matching word picks the group', () => {
  const imagine = [t('Culinary Arts', '08:00'), t('Smart Music Studio', '09:00'), t('Art Gallery', '10:00')];
  // "Smart" is not art (so it's music), and "Culinary Arts" is culinary, not art.
  expect(orderTracks('imaginex', imagine).map((x) => x.title)).toEqual(['Art Gallery', 'Smart Music Studio', 'Culinary Arts']);
});
