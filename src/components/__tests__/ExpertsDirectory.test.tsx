import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PublicExpert } from '../../services/experts';

// A plain function, not vi.fn(): a mock's result tracking reports the rejected promise as unhandled.
const state = vi.hoisted(() => ({ fetch: (): Promise<unknown> => Promise.resolve([]) }));
vi.mock('../../services/experts', () => ({ fetchPublicExperts: () => state.fetch() }));

import ExpertsDirectory, { EXPERTS_EMPTY, EXPERTS_ERROR } from '../ExpertsDirectory';

const ada: PublicExpert = {
  id: 'a', name: 'Ada Park', photoUrl: null, title: 'Roboticist', company: 'Acme', expertise: 'Robotics',
  bio: 'I build robots.', linkedInUrl: 'https://www.linkedin.com/in/ada',
  tracks: [{ id: 's1', title: 'CADathon Workshop', discipline: 'techverse' }],
};
const ben: PublicExpert = {
  id: 'b', name: 'Ben Ruiz', photoUrl: null, title: 'Biologist', company: 'Lab', expertise: 'Ecology',
  bio: 'Coral reefs.', linkedInUrl: null,
  tracks: [{ id: 's2', title: 'Bio Lab', discipline: 'biosphere' }],
};

function page() {
  return render(<MemoryRouter><ExpertsDirectory /></MemoryRouter>);
}

beforeEach(() => { state.fetch = () => Promise.resolve([]); });

describe('Experts page list', () => {
  test('says so when no expert has picked a track yet', async () => {
    state.fetch = () => Promise.resolve([]);
    page();
    expect(await screen.findByText(EXPERTS_EMPTY)).toBeInTheDocument();
  });

  test('says so when the list will not load', async () => {
    state.fetch = () => Promise.reject(new Error('down'));
    page();
    expect(await screen.findByRole('alert')).toHaveTextContent(EXPERTS_ERROR);
  });

  test('lists every expert; See more shows their tracks and LinkedIn', async () => {
    state.fetch = () => Promise.resolve([ada, ben]);
    const user = userEvent.setup();
    page();
    expect(await screen.findByText('Ada Park')).toBeInTheDocument();
    expect(screen.getByText('Ben Ruiz')).toBeInTheDocument();
    expect(screen.getByText(/2 experts are sharing their time/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'See more about Ada Park' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'CADathon Workshop' })).toHaveAttribute('href', '/sessions/s1');
    expect(within(dialog).getByRole('link', { name: /Connect on LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/ada');
  });

  test('filters by discipline once experts span more than one', async () => {
    state.fetch = () => Promise.resolve([ada, ben]);
    const user = userEvent.setup();
    page();
    await screen.findByText('Ada Park');
    await user.click(screen.getByRole('button', { name: 'BioSphere' }));
    expect(screen.queryByText('Ada Park')).toBeNull();
    expect(screen.getByText('Ben Ruiz')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Ada Park')).toBeInTheDocument();
  });
});
