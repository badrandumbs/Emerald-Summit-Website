import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({ gallery: vi.fn(), create: vi.fn() }));

vi.mock('../../services/sessionPhotos', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/sessionPhotos')>(),
  fetchHomeGallery: mocks.gallery,
}));
vi.mock('../../services/summitContent', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/summitContent')>(),
  createDiscipline: mocks.create,
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import PhotoSlideshow from '../home/PhotoSlideshow';
import LinksCard from '../home/LinksCard';
import {
  AboutAppCard,
  EAF_DONATE_EMBED_URL,
  EAF_DONATE_URL,
  EAF_VOLUNTEER_URL,
  SPONSOR_EMAIL,
  SPONSOR_TIERS,
  SponsorsCard,
  SupportEafCard,
} from '../home/AboutSections';
import NewDisciplineDialog from '../verse/NewDisciplineDialog';

beforeEach(() => vi.clearAllMocks());

describe('Home photo slideshow', () => {
  test('shows nothing while the bucket is empty', async () => {
    mocks.gallery.mockResolvedValue([]);
    const { container } = render(<PhotoSlideshow />);
    await waitFor(() => expect(mocks.gallery).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('moves to the next photo every 5 seconds and loads only the current and next', async () => {
    vi.useFakeTimers();
    mocks.gallery.mockResolvedValue(['a', 'b', 'c'].map((n) => ({ name: n, url: `https://cdn/${n}.jpg` })));
    const { container } = render(<PhotoSlideshow />);
    await act(async () => {}); // let the bucket listing resolve
    expect(screen.getByRole('button', { name: 'Photo 1 of 3' })).toHaveAttribute('aria-current', 'true');
    expect([...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['https://cdn/a.jpg', 'https://cdn/b.jpg']);
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole('button', { name: 'Photo 2 of 3' })).toHaveAttribute('aria-current', 'true');
    vi.useRealTimers();
  });
});

describe('Home links', () => {
  test("are the app's three", () => {
    render(<LinksCard />);
    expect(screen.getByRole('link', { name: /Summit website/ })).toHaveAttribute('href', 'https://emeraldsummit.ehsacademics.org');
    expect(screen.getByRole('link', { name: /Instagram/ })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /Contact/ })).toHaveAttribute('href', 'mailto:president@ehsacademics.org');
  });
});

describe('About, Support EAF and Sponsors', () => {
  test('Donate opens the Zeffy form in a popup, and Volunteer goes to the parent volunteering page', async () => {
    const user = userEvent.setup();
    render(<SupportEafCard />);
    expect(screen.getByRole('region', { name: 'Support EAF' })).toBeInTheDocument();
    const volunteer = screen.getByRole('link', { name: /Volunteer with EAF/ });
    expect(volunteer).toHaveAttribute('href', EAF_VOLUNTEER_URL);
    expect(volunteer).toHaveAttribute('target', '_blank');
    await user.click(screen.getByRole('button', { name: /Donate/ }));
    const dialog = screen.getByRole('dialog', { name: 'Donate to EAF' });
    expect(within(dialog).getByTitle('Donation form powered by Zeffy')).toHaveAttribute('src', EAF_DONATE_EMBED_URL);
    expect(within(dialog).getByRole('link', { name: /Open in a new tab/ })).toHaveAttribute('href', EAF_DONATE_URL);
  });

  test('On a phone, Donate opens the Zeffy page in a new tab instead', () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === '(max-width: 48rem)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    try {
      render(<SupportEafCard />);
      const donate = screen.getByRole('link', { name: /Donate/ });
      expect(donate).toHaveAttribute('href', EAF_DONATE_URL);
      expect(donate).toHaveAttribute('target', '_blank');
      expect(screen.queryByRole('button', { name: /Donate/ })).not.toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('Sponsors shows every tier and an email to sign on', () => {
    render(<SponsorsCard />);
    for (const t of SPONSOR_TIERS) expect(screen.getByText(t.name)).toBeInTheDocument();
    const email = screen.getByRole('link', { name: /Become a sponsor/ });
    expect(email).toHaveAttribute('href', `mailto:${SPONSOR_EMAIL}`);
    expect(email).not.toHaveAttribute('target');
  });

  test('Sponsors rank the tiers highest first, link each logo to its site, and leave an open spot in every tier', () => {
    render(
      <SponsorsCard
        sponsors={[
          { name: 'Acme Co', tier: 'Capstone', url: 'https://acme.example/', logo: '/sponsors/acme.png' },
          { name: 'Corner Cafe', tier: 'Cornerstone', url: 'https://cafe.example/', logo: '/sponsors/cafe.png' },
        ]}
      />,
    );
    const tiers = within(screen.getByRole('list', { name: /Sponsor tiers/ })).getAllByRole('listitem', { name: /^[A-Z]/ });
    expect(tiers.map((t) => t.getAttribute('aria-label'))).toEqual(SPONSOR_TIERS.map((t) => t.name));
    const capstone = screen.getByRole('list', { name: 'Capstone sponsors' });
    const acme = within(capstone).getByRole('link', { name: 'Acme Co' });
    expect(acme).toHaveAttribute('href', 'https://acme.example/');
    expect(acme).toHaveAttribute('target', '_blank');
    expect(within(acme).getByRole('img', { name: 'Acme Co' })).toHaveAttribute('src', '/sponsors/acme.png');
    expect(within(screen.getByRole('list', { name: 'Cornerstone sponsors' })).getByRole('link', { name: 'Corner Cafe' })).toBeInTheDocument();
    for (const t of SPONSOR_TIERS) {
      const open = within(screen.getByRole('list', { name: `${t.name} sponsors` })).getByRole('link', { name: /Your company logo could go here/ });
      expect(open).toHaveTextContent('Your company logo could go here');
      expect(open.getAttribute('href')).toMatch(new RegExp(`^mailto:${SPONSOR_EMAIL}\\?subject=`));
    }
  });

  test("EAF's sponsors are listed, with Brightfox at Keystone", () => {
    render(<SponsorsCard />);
    expect(within(screen.getByRole('list', { name: 'Keystone sponsors' })).getByRole('link', { name: 'Brightfox' })).toHaveAttribute('href', 'https://gobrightfox.com/');
    const cornerstone = screen.getByRole('list', { name: 'Cornerstone sponsors' });
    for (const name of ['Prepaze Academy', 'YoungWonks', 'Praan Health']) {
      expect(within(cornerstone).getByRole('link', { name })).toBeInTheDocument();
    }
  });

  test('About the app credits the student developers', () => {
    render(<AboutAppCard />);
    const about = screen.getByRole('region', { name: 'About the app' });
    expect(about).toHaveTextContent('100% built by Emerald High School students');
    expect(about).toHaveTextContent('Arjun Mahajan and Akhil Muthyala');
    expect(about).toHaveTextContent('Nithali Anand, Arush Singh, Guhan Bala and Deep Shah');
  });
});

describe('New discipline', () => {
  test('checks the id and name with the app wording', async () => {
    const user = userEvent.setup();
    render(<NewDisciplineDialog open onOpenChange={vi.fn()} />);
    await user.type(screen.getByLabelText('Id (slug)'), 'Health Verse');
    await user.click(screen.getByRole('button', { name: /Create discipline/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Id must be lowercase letters, numbers, or _.');
    await user.clear(screen.getByLabelText('Id (slug)'));
    await user.type(screen.getByLabelText('Id (slug)'), 'healthverse');
    await user.click(screen.getByRole('button', { name: /Create discipline/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Name is required.');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  test('creates it and closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mocks.create.mockResolvedValue(undefined);
    render(<NewDisciplineDialog open onOpenChange={onOpenChange} />);
    await user.type(screen.getByLabelText('Id (slug)'), 'HealthVerse');
    await user.type(screen.getByLabelText('Name'), 'HealthVerse');
    await user.type(screen.getByLabelText('Tagline'), 'Medicine & public health');
    await user.click(screen.getByRole('button', { name: /Create discipline/ }));
    expect(mocks.create).toHaveBeenCalledWith({ id: 'healthverse', name: 'HealthVerse', tagline: 'Medicine & public health', icon: 'category' });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  test('a taken id says so', async () => {
    const user = userEvent.setup();
    mocks.create.mockRejectedValue(new Error('duplicate key'));
    render(<NewDisciplineDialog open onOpenChange={vi.fn()} />);
    await user.type(screen.getByLabelText('Id (slug)'), 'techverse');
    await user.type(screen.getByLabelText('Name'), 'TechVerse');
    await user.click(screen.getByRole('button', { name: /Create discipline/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create. The id may already be taken.');
  });
});
