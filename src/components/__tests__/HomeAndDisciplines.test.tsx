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
  SupportEafCard,
} from '../home/AboutSections';
import { SponsorTiers } from '../../pages/Summit27Page';
import { SPONSOR_FORM_URL } from '../../models/sponsors';

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

  test('The Zeffy form loads before the click, once Donate is near the screen, and shows when Zeffy says it is drawn', async () => {
    let seen: IntersectionObserverCallback = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: IntersectionObserverCallback) { seen = cb; }
      observe() {}
      disconnect() {}
    });
    try {
      const user = userEvent.setup();
      const { container } = render(<SupportEafCard />);
      expect(container.querySelector('iframe')).toBeNull();
      act(() => seen([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
      const frame = container.querySelector('iframe')!;
      expect(frame).toHaveAttribute('src', EAF_DONATE_EMBED_URL);
      // Not shown yet: nothing to see, and no dialog in the page.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // A message from another frame doesn't count.
      act(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://www.zeffy.com', data: { id: 'zeffy-iframe' } })));
      await user.click(screen.getByRole('button', { name: /Donate/ }));
      const dialog = screen.getByRole('dialog', { name: 'Donate to EAF' });
      expect(within(dialog).getByRole('status')).toHaveTextContent('Loading the form');
      act(() => window.dispatchEvent(new MessageEvent('message', {
        origin: 'https://www.zeffy.com',
        source: frame.contentWindow,
        data: { id: 'zeffy-iframe', height: 700 },
      })));
      expect(within(dialog).queryByRole('status')).not.toBeInTheDocument();
      // Closing keeps the loaded form for next time.
      await user.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(container.querySelector('iframe')).toBe(frame);
    } finally {
      vi.unstubAllGlobals();
    }
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

  test('Become a sponsor and the open logo spots go to the sponsor Google Form in a new tab', async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<SponsorTiers sponsors={[]} />);
    const link = screen.getByRole('link', { name: /Become a sponsor/ });
    expect(link).toHaveAttribute('href', SPONSOR_FORM_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(SPONSOR_FORM_URL).toContain('docs.google.com/forms');
    await user.click(screen.getAllByRole('button', { name: /logo/i })[0]);
    expect(open).toHaveBeenCalledWith(SPONSOR_FORM_URL, '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  test('About the app credits the student developers', () => {
    render(<AboutAppCard />);
    const about = screen.getByRole('region', { name: 'About the app' });
    expect(about).toHaveTextContent('100% built by Emerald High School students');
    expect(about).toHaveTextContent('Arjun Mahajan and Akhil Muthyala');
    expect(about).toHaveTextContent('Nihtahli Anand, Arush Singh, Guhan Bala and Deep Shah');
  });
});
