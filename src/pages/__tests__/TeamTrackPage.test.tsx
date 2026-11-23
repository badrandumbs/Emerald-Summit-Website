import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';

const catalog = vi.hoisted(() => ({
  sessions: [] as { id: string; title: string; track: string; trackName?: string; time?: string }[],
  source: 'bundle',
  configured: true,
  load: vi.fn(),
}));
vi.mock('../../models/sessions', () => ({ MOCK_SESSIONS: catalog.sessions }));
vi.mock('../../services/summitContent', () => ({
  contentSource: () => catalog.source,
  usesSharedBackend: () => catalog.configured,
  loadSummitContent: catalog.load,
  useSummitContent: () => 0,
}));

import TeamTrackPage from '../TeamTrackPage';

function Destination() {
  return <p>Opened track {useParams().id}</p>;
}
function open(key = 'cadathon') {
  return render(<MemoryRouter initialEntries={['/team/tracks/' + key]}><Routes>
    <Route path="/team/tracks/:key" element={<TeamTrackPage />} />
    <Route path="/sessions/:id" element={<Destination />} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  catalog.sessions.splice(0);
  catalog.source = 'bundle';
  catalog.configured = true;
  catalog.load.mockReset().mockImplementation(async () => { catalog.source = 'database'; });
});

test('waits for live catalog data and forwards to its real track page', async () => {
  let finish!: () => void;
  catalog.load.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  open();
  expect(screen.getByRole('status')).toHaveTextContent('Opening track details');
  await act(async () => {
    catalog.source = 'database';
    catalog.sessions.push({ id: 'live-cad-id', title: 'CADathon', track: 'techverse' });
    finish();
  });
  expect(await screen.findByText('Opened track live-cad-id')).toBeInTheDocument();
});

test('a missing track has a retry action instead of a fabricated destination', async () => {
  open();
  expect(await screen.findByText(/Track details are not available/)).toBeInTheDocument();
  catalog.load.mockImplementation(async () => {
    catalog.source = 'database';
    catalog.sessions.push({ id: 'new-cad-id', title: 'CADathon', track: 'techverse' });
  });
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Opened track new-cad-id')).toBeInTheDocument();
});

test('two matching slots offer the actual tracks instead of choosing the first arbitrarily', async () => {
  catalog.source = 'database';
  catalog.sessions.push(
    { id: 'morning', title: 'CADathon', track: 'techverse', time: '9:00 AM' },
    { id: 'afternoon', title: 'CADathon', track: 'techverse', time: '1:00 PM' },
  );
  open();
  await userEvent.click(await screen.findByRole('link', { name: 'CADathon · 1:00 PM' }));
  expect(await screen.findByText('Opened track afternoon')).toBeInTheDocument();
});

test('bundled sample IDs never masquerade as live track destinations', async () => {
  catalog.configured = false;
  catalog.sessions.push({ id: 'sample-only', title: 'CADathon', track: 'techverse' });
  catalog.load.mockResolvedValue(undefined);
  open();
  expect(await screen.findByText(/Track details are not available/)).toBeInTheDocument();
  expect(screen.queryByText('Opened track sample-only')).not.toBeInTheDocument();
});
