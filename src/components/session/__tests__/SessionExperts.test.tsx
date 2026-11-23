import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SessionExpertsView from '../SessionExperts';
import type { SessionExpert } from '../../../services/sessionRegistration';

const jane: SessionExpert = {
  id: '1', name: 'Jane Doe', photoUrl: 'https://example.test/jane.jpg', title: 'Robotics Engineer', company: 'Acme',
  expertise: 'Robotics', bio: 'I build warehouse robots.', linkedInUrl: 'https://www.linkedin.com/in/jane',
  tracks: [
    { id: 's1', title: 'CADathon Workshop', discipline: 'techverse' },
    { id: 's2', title: 'Computer Science Exhibits', discipline: 'techverse' },
  ],
};
const sam: SessionExpert = {
  id: '2', name: 'Sam Lee', photoUrl: null, title: 'Designer', company: 'Studio', expertise: null, bio: 'I design.', linkedInUrl: null,
  tracks: [{ id: 's3', title: 'Product Design', discipline: 'imaginex' }],
};

describe('expert cards on a track page', () => {
  test('nothing shows without experts', () => {
    const { container } = render(<MemoryRouter><SessionExpertsView experts={[]} accent="#10b981" /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });

  test('each card has the name, title, company and expertise; See more opens the whole profile', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SessionExpertsView experts={[jane, sam]} accent="#10b981" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Experts' })).toBeInTheDocument();
    expect(screen.getByText('Robotics Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Robotics')).toBeInTheDocument();
    expect(screen.getByText('SL')).toBeInTheDocument(); // no photo: initials
    expect(screen.queryByText('I build warehouse robots.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'See more about Jane Doe' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Robotics Engineer at Acme')).toBeInTheDocument();
    expect(within(dialog).getByText('I build warehouse robots.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Connect on LinkedIn/ })).toHaveAttribute('href', 'https://www.linkedin.com/in/jane');
    // Every track they serve in, each linking to its page.
    expect(within(dialog).getByText('Serving as an expert in 2 tracks')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'CADathon Workshop' })).toHaveAttribute('href', '/sessions/s1');
    expect(within(dialog).getByRole('link', { name: 'Computer Science Exhibits' })).toHaveAttribute('href', '/sessions/s2');
  });

  test('no LinkedIn button when the expert keeps it private', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SessionExpertsView experts={[sam]} accent="#10b981" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Expert' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See more about Sam Lee' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Serving as an expert in 1 track')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: /LinkedIn/ })).not.toBeInTheDocument();
  });
});
