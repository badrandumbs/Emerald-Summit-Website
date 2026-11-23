import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PieChart } from '../MetricsBits';

test('every slice gets its own colour, the muted one is grey, and the chart reads out its numbers', () => {
  const rows: [string, number][] = [...Array.from({ length: 10 }, (_, i) => [`School ${i}`, 1] as [string, number]), ['No school given', 2]];
  const { container } = render(<PieChart rows={rows} total={12} emptyText="None" mutedLabel="No school given" />);
  const fills = [...container.querySelectorAll('svg path')].map((p) => p.getAttribute('fill'));
  expect(fills).toHaveLength(11);
  expect(new Set(fills).size).toBe(11);
  expect(fills[10]).toBe('#475569');
  expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining('No school given: 2 (17%)'));
});

test('no rows shows the empty text', () => {
  render(<PieChart rows={[]} total={0} emptyText="Nobody yet" />);
  expect(screen.getByText('Nobody yet')).toBeInTheDocument();
});
