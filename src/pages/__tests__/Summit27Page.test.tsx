import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Summit27Page from '../Summit27Page';
import LandingNav from '../../components/LandingNav';
import { EAF_DONATE_URL, EAF_VOLUNTEER_URL } from '../../components/home/AboutSections';
import { SPONSOR_TIERS } from '../../models/sponsors';

describe("Emerald Summit '27 page", () => {
  test("the landing navbar's Summit '27 link opens the page", async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingNav />} />
          <Route path="/summit-27" element={<p>Summit 27 page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    await userEvent.click(within(nav).getByRole('button', { name: "Summit '27" }));
    expect(screen.getByText('Summit 27 page')).toBeInTheDocument();
  });

  test('opens without signing in, with the Summit facts, sponsor terraces, donation links and a Coming soon team section', () => {
    render(<MemoryRouter initialEntries={['/summit-27']}><Summit27Page /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: "Emerald Summit '27" })).toBeInTheDocument();
    expect(screen.getByText('Saturday, January 23, 2027')).toBeInTheDocument();
    expect(screen.getByText('Emerald High School, Dublin, CA')).toBeInTheDocument();

    const tiers = screen.getByRole('list', { name: 'Sponsor tiers, highest first' });
    expect(within(tiers).getAllByRole('button')).toHaveLength(SPONSOR_TIERS.length);

    expect(screen.getByRole('link', { name: /Donate to EAF/ })).toHaveAttribute('href', EAF_DONATE_URL);
    expect(screen.getByRole('link', { name: /Volunteer with EAF/ })).toHaveAttribute('href', EAF_VOLUNTEER_URL);

    const speaker = screen.getByRole('heading', { name: "Who's the guest speaker?" }).closest('section')!;
    expect(within(speaker).getByText('Coming soon')).toBeInTheDocument();

    const team = screen.getByRole('heading', { name: "Who's running the Summit?" }).closest('section')!;
    expect(within(team).getByText('Coming soon')).toBeInTheDocument();
  });
});
