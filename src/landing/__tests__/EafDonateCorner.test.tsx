import { beforeEach, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import EafDonateCorner from '../EafDonateCorner';
import { EAF_VOLUNTEER_URL } from '../../components/home/AboutSections';

const device = vi.hoisted(() => ({ phone: false }));
vi.mock('../../lib/device', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/device')>()),
  useIsPhoneScreen: () => device.phone,
}));

beforeEach(() => {
  device.phone = false;
});

test('hovering the EAF seal opens Support EAF with Donate and Volunteer', () => {
  render(<EafDonateCorner />);
  const seal = screen.getByRole('button', { name: 'Support the EHS Academic Foundation' });
  expect(screen.queryByRole('region', { name: 'Support EAF' })).toBeNull();
  fireEvent.mouseEnter(seal.parentElement!);
  expect(screen.getByRole('region', { name: 'Support EAF' })).toBeInTheDocument();
  expect(seal).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: /Donate/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Volunteer with EAF/ })).toHaveAttribute('href', EAF_VOLUNTEER_URL);
});

test('a click opens it too, and Escape closes it', () => {
  render(<EafDonateCorner />);
  fireEvent.click(screen.getByRole('button', { name: 'Support the EHS Academic Foundation' }));
  expect(screen.getByRole('region', { name: 'Support EAF' })).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('region', { name: 'Support EAF' })).toBeNull();
});

test('phones never get the seal', () => {
  device.phone = true;
  const { container } = render(<EafDonateCorner />);
  expect(container).toBeEmptyDOMElement();
});
