import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionExperts from '../SessionExperts';
import type { SessionExpert } from '../../../services/sessionRegistration';

const jane: SessionExpert = {
  id: '1', name: 'Jane Doe', photoUrl: 'https://example.test/jane.jpg', title: 'Robotics Engineer', company: 'Acme',
  expertise: 'Robotics', bio: 'I build warehouse robots.', linkedInUrl: 'https://www.linkedin.com/in/jane',
};
const sam: SessionExpert = {
  id: '2', name: 'Sam Lee', photoUrl: null, title: 'Designer', company: 'Studio', expertise: null, bio: 'I design.', linkedInUrl: null,
};

describe('expert cards on a track page', () => {
  test('nothing shows without experts', () => {
    const { container } = render(<SessionExperts experts={[]} accent="#10b981" />);
    expect(container).toBeEmptyDOMElement();
  });

  test('each card has the name, title, company and expertise; See more opens the whole profile', async () => {
    const user = userEvent.setup();
    render(<SessionExperts experts={[jane, sam]} accent="#10b981" />);
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
  });

  test('no LinkedIn button when the expert keeps it private', async () => {
    const user = userEvent.setup();
    render(<SessionExperts experts={[sam]} accent="#10b981" />);
    expect(screen.getByRole('heading', { name: 'Expert' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See more about Sam Lee' }));
    expect(within(screen.getByRole('dialog')).queryByRole('link')).not.toBeInTheDocument();
  });
});
