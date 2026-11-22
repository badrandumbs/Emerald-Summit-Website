import { expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TechVerseTracks from '../TechVerseTracks';

test('keeps CS left and Engineering right, with presentations and exhibits on shared rows', () => {
  render(<TechVerseTracks columns={{
    computerScience: ['Computer Science Presentations', 'Computer Science Exhibits', 'AI Playground'],
    engineering: ['Engineering Presentations', 'Engineering Exhibits', 'Robothon'],
    other: ['Open technology studio'],
  }} />);

  const table = screen.getByRole('table', { name: 'TechVerse tracks' });
  expect(within(table).getAllByRole('columnheader').map((header) => header.textContent))
    .toEqual(['Computer Science', 'Engineering']);
  for (const format of ['Presentations', 'Exhibits']) {
    const cs = within(table).getByRole('cell', { name: `Computer Science ${format}` });
    const engineering = within(table).getByRole('cell', { name: `Engineering ${format}` });
    expect(cs.parentElement).toBe(engineering.parentElement);
    expect(within(cs.parentElement!).getAllByRole('cell')).toEqual([cs, engineering]);
  }
  expect(screen.getByRole('list', { name: 'Other TechVerse tracks' }))
    .toHaveTextContent('Open technology studio');
});

test('a missing counterpart stays empty instead of shifting an exhibit into the presentation row', () => {
  render(<TechVerseTracks columns={{
    computerScience: ['Computer Science Presentations', 'Computer Science Exhibits'],
    engineering: ['Engineering Exhibits'],
    other: [],
  }} />);

  const presentation = screen.getByRole('cell', { name: 'Computer Science Presentations' });
  const presentationCells = within(presentation.parentElement!).getAllByRole('cell');
  expect(presentationCells[1]).toBeEmptyDOMElement();
  expect(screen.getByRole('cell', { name: 'Computer Science Exhibits' }).parentElement)
    .toBe(screen.getByRole('cell', { name: 'Engineering Exhibits' }).parentElement);
  expect(screen.queryByRole('list', { name: 'Other TechVerse tracks' })).not.toBeInTheDocument();
});
