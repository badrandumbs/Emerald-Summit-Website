import { expect, test } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SponsorTerraces from '../SponsorTerraces';
import { SPONSOR_EMAIL, SPONSOR_TIERS } from '../../models/sponsors';

const terraces = () => within(screen.getByRole('list', { name: /Sponsor tiers/ })).getAllByRole('button');

test('one terrace per tier, highest first, with Capstone out to start', () => {
  render(<SponsorTerraces />);
  expect(terraces().map((b) => b.getAttribute('aria-label')!.split(',')[0])).toEqual(SPONSOR_TIERS.map((t) => t.name));
  expect(terraces()[0]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Capstone' })).toBeInTheDocument();
  expect(screen.getByText('No sponsors at this level yet')).toBeInTheDocument();
});

test('picking a terrace shows that tier, its sponsors as links, and an email for that tier', () => {
  render(<SponsorTerraces />);
  fireEvent.mouseEnter(terraces()[4]);
  expect(terraces()[4]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Cornerstone' })).toBeInTheDocument();
  expect(screen.getByText('$500')).toBeInTheDocument();
  for (const name of ['Prepaze Academy', 'YoungWonks', 'Praan Health']) {
    expect(screen.getByRole('link', { name })).toHaveAttribute('target', '_blank');
  }
  const email = screen.getByRole('link', { name: /Become a Cornerstone sponsor/ });
  expect(email.getAttribute('href')).toMatch(new RegExp(`^mailto:${SPONSOR_EMAIL}\\?subject=Cornerstone`));
});

test('keyboard focus picks a terrace too', () => {
  render(<SponsorTerraces />);
  fireEvent.focus(terraces()[1]);
  expect(screen.getByRole('heading', { name: 'Keystone' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Brightfox' })).toHaveAttribute('href', 'https://gobrightfox.com/');
});
