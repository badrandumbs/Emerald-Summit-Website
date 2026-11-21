import { expect, test } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SponsorTerraces from '../SponsorTerraces';
import { SPONSOR_EMAIL, SPONSOR_TIERS } from '../../models/sponsors';

const SAMPLE = [
  { name: 'Acme Co', tier: 'Cornerstone' as const, url: 'https://acme.example/', logo: '/sponsors/acme.png' },
  { name: 'Corner Cafe', tier: 'Keystone' as const, url: 'https://cafe.example/', logo: '/sponsors/cafe.png' },
];

const terraces = () => within(screen.getByRole('list', { name: /Sponsor tiers/ })).getAllByRole('button');

test('one terrace per tier, highest first, with Capstone out to start', () => {
  render(<SponsorTerraces />);
  expect(terraces().map((b) => b.getAttribute('aria-label')!.split(',')[0])).toEqual(SPONSOR_TIERS.map((t) => t.name));
  expect(terraces()[0]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Capstone' })).toBeInTheDocument();
  expect(screen.getByText('No sponsors at this level yet')).toBeInTheDocument();
});

test('with no sponsors yet, every terrace is open', () => {
  render(<SponsorTerraces />);
  for (const b of terraces()) expect(b.getAttribute('aria-label')).toMatch(/no sponsors yet$/);
});

test('picking a terrace shows that tier, its sponsors as links, and an email for that tier', () => {
  render(<SponsorTerraces sponsors={SAMPLE} />);
  fireEvent.mouseEnter(terraces()[4]);
  expect(terraces()[4]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Cornerstone' })).toBeInTheDocument();
  expect(screen.getByText('$500')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Acme Co' })).toHaveAttribute('target', '_blank');
  const email = screen.getByRole('link', { name: /Become a Cornerstone sponsor/ });
  expect(email.getAttribute('href')).toMatch(new RegExp(`^mailto:${SPONSOR_EMAIL}\\?subject=Cornerstone`));
});

test('keyboard focus picks a terrace too', () => {
  render(<SponsorTerraces sponsors={SAMPLE} />);
  fireEvent.focus(terraces()[1]);
  expect(screen.getByRole('heading', { name: 'Keystone' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Corner Cafe' })).toHaveAttribute('href', 'https://cafe.example/');
});
