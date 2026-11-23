import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeamLinkedText from '../TeamLinkedText';

test('renders clickable track names without changing any paragraph characters', () => {
  const text = "I lead Engineering Exhibits & CADathon. I'm in 11th grade.";
  render(
    <MemoryRouter initialEntries={['/summit-27/team']}>
      <p data-testid="bio"><TeamLinkedText text={text} mentions={[
        { text: 'Engineering Exhibits', target: 'engineering-exhibits' },
        { text: 'CADathon', target: 'cadathon' },
      ]} /></p>
    </MemoryRouter>,
  );
  expect(screen.getByTestId('bio').textContent).toBe(text);
  expect(screen.getByRole('link', { name: 'Engineering Exhibits' })).toHaveAttribute('href', '/team/tracks/engineering-exhibits');
  expect(screen.getByRole('link', { name: 'CADathon' })).toHaveAttribute('href', '/team/tracks/cadathon');
});
