// Home's Support EAF, Sponsors and About the app sections (website only for
// now). EAF links and the sponsor tiers come from EAF's real site,
// ehsacademics.org (Initiatives → Emerald Summit '27 → Sponsor; checked
// Nov 14, 2026). The old Google Sites page (sites.google.com/view/
// ehs-academic-foundation) is out of date: don't use it.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { ArrowRight, HeartHandshake, Loader2, Mail, Plus, type AppIcon } from '@/components/icons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsPhoneScreen } from '@/lib/device';
import SummitLogo from '../SummitLogo';
import { cn } from '@/lib/utils';

const EAF_SITE = 'https://www.ehsacademics.org';
/**
 * EAF's Zeffy donation form, "Be the catalyst for learning and discovery".
 * Computers and tablets get it embedded in a popup (the embed's iframe, the
 * same URL Zeffy's embed code falls back to); phones open the full page.
 */
const ZEFFY_FORM = 'be-the-catalyst-for-learning-and-discovery';
export const EAF_DONATE_URL = `https://www.zeffy.com/en-US/donation-form/${ZEFFY_FORM}`;
export const EAF_DONATE_EMBED_URL = `https://www.zeffy.com/embed/donation-form/${ZEFFY_FORM}`;
export const EAF_VOLUNTEER_URL = `${EAF_SITE}/get-involved/parent-volunteering`;
export const SPONSORSHIP_DETAILS_URL = `${EAF_SITE}/initiatives/emerald-summit-27/sponsor`;
/** The sponsor page says "Questions? Email contact@ehsacademics.org" (its sign-up form is closed). */
export const SPONSOR_EMAIL = 'contact@ehsacademics.org';

export type SponsorTierName = 'Capstone' | 'Keystone' | 'Pillar' | 'Foundation' | 'Cornerstone';

/**
 * Highest tier first: the order the Sponsors section ranks them in. From the
 * Sponsorship Tiers table on EAF's sponsor page; each includes the ones below.
 */
export const SPONSOR_TIERS: { name: SponsorTierName; amount: string; perks: string }[] = [
  { name: 'Capstone', amount: '$5,000', perks: 'Everything in Keystone, plus a year-long portal link' },
  { name: 'Keystone', amount: '$2,000', perks: "Everything in Pillar, plus a month-long portal link, visibility on the EAF portal and an ad on the ES'27 app" },
  { name: 'Pillar', amount: '$1,500', perks: 'Everything in Foundation, plus a table or flyers in the Student Union for 2 hours, or a banner at a discipline of your choice' },
  { name: 'Foundation', amount: '$1,000', perks: 'Everything in Cornerstone, plus a banner at the entrance' },
  { name: 'Cornerstone', amount: '$500', perks: 'A mention in the keynote and your logo on the event slides' },
];

export interface Sponsor {
  name: string;
  tier: SponsorTierName;
  /** Their website; the logo links straight to it. */
  url: string;
  /** Logo under public/, on a white background. */
  logo: string;
}

/**
 * EAF's current sponsors (from the organizers, Nov 14, 2026). Add one here
 * with its logo in public/sponsors/ and it shows up under its tier. Logos are
 * cut from EAF's "Our Cornerstone Sponsors" graphic.
 */
export const SPONSORS: Sponsor[] = [
  { name: 'Brightfox', tier: 'Keystone', url: 'https://gobrightfox.com/', logo: '/sponsors/brightfox.png' },
  { name: 'Prepaze Academy', tier: 'Cornerstone', url: 'https://prepazeacademy.com/', logo: '/sponsors/prepaze-academy.png' },
  { name: 'YoungWonks', tier: 'Cornerstone', url: 'https://www.youngwonks.com/', logo: '/sponsors/youngwonks.png' },
  { name: 'Praan Health', tier: 'Cornerstone', url: 'https://praan.health/', logo: '/sponsors/praan-health.png' },
];

/**
 * Each step of the ladder, top to bottom: how wide it is from sm up (the
 * tiers stack into a peak) and its colors. The top two are solid emerald,
 * the rest fade to a light tint.
 */
const TIER_STEPS: { width: string; band: string; solid: boolean }[] = [
  { width: 'sm:w-[56%]', band: 'bg-emerald-deep text-white', solid: true },
  { width: 'sm:w-[67%]', band: 'bg-emerald text-white', solid: true },
  { width: 'sm:w-[78%]', band: 'border border-emerald/25 bg-emerald/[0.15]', solid: false },
  { width: 'sm:w-[89%]', band: 'border border-emerald/20 bg-emerald/[0.09]', solid: false },
  { width: 'sm:w-full', band: 'border border-emerald/15 bg-emerald/[0.04]', solid: false },
];

function SectionTitle({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="mb-3 font-display text-xl font-bold tracking-tight sm:text-2xl">{children}</h2>;
}

function buttonClass(primary?: boolean) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors',
    primary ? 'bg-emerald text-white hover:bg-emerald-deep' : 'border border-border bg-card hover:border-emerald/40',
  );
}

function LinkButton({
  href,
  children,
  primary,
  icon: Icon = ArrowRight,
}: {
  href: string;
  children: string;
  primary?: boolean;
  icon?: AppIcon;
}) {
  const external = !href.startsWith('mailto:');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel="noreferrer"
      className={buttonClass(primary)}
    >
      {children}
      <Icon className={cn('h-3.5 w-3.5', external && Icon === ArrowRight && '-rotate-45')} aria-hidden />
    </a>
  );
}

/**
 * Donate: on a phone, a link that opens Zeffy's page in a new tab (an
 * embedded payment form in a popup is cramped there); anywhere else, a
 * popup with the Zeffy form embedded, so people give without leaving.
 */
function DonateButton() {
  const phone = useIsPhoneScreen();
  const [open, setOpen] = useState(false);
  // Zeffy's form takes a few seconds to appear; say so instead of a blank box.
  const [loaded, setLoaded] = useState(false);
  const revealTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(revealTimer.current), []);
  const openChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      window.clearTimeout(revealTimer.current);
      setLoaded(false);
    }
  };
  if (phone) return <LinkButton href={EAF_DONATE_URL} primary icon={HeartHandshake}>Donate</LinkButton>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass(true)}>
        Donate
        <HeartHandshake className="h-3.5 w-3.5" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={openChange}>
        <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left">
            <DialogTitle className="font-display text-lg">Donate to EAF</DialogTitle>
            <DialogDescription className="text-[13px]">
              Secure form by Zeffy. EAF is a 501(c)(3) nonprofit, so your gift is tax-deductible.{' '}
              <a href={EAF_DONATE_URL} target="_blank" rel="noreferrer" className="font-semibold text-emerald underline-offset-2 hover:underline">
                Open in a new tab
              </a>
            </DialogDescription>
          </DialogHeader>
          <div className="relative h-[min(72vh,760px)] w-full">
            {!loaded && (
              <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading the donation form…
              </p>
            )}
            <iframe
              title="Donation form powered by Zeffy"
              src={EAF_DONATE_EMBED_URL}
              allow="payment"
              // Zeffy's page reports loaded before it draws the form (about
              // 2 s more), so the message stays up a little past onLoad.
              onLoad={() => {
                window.clearTimeout(revealTimer.current);
                revealTimer.current = window.setTimeout(() => setLoaded(true), 2000);
              }}
              className={cn('absolute inset-0 h-full w-full border-0 transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SupportEafCard() {
  return (
    <section aria-labelledby="support-eaf">
      <SectionTitle id="support-eaf">Support EAF</SectionTitle>
      <div className="rounded-3xl border border-emerald/20 bg-gradient-to-br from-emerald/10 to-emerald/[0.03] p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <SummitLogo size={64} className="shrink-0" />
          <div className="max-w-3xl space-y-3 text-[14.5px] leading-relaxed">
            <p>
              This Emerald Summit App is brought to you 100% built by students and free for all to use.
            </p>
            <p>
              Emerald Academic Foundation (EAF) supports student-initiated projects, like this app, along
              with several others that bring opportunities to students across areas, ultimately
              empowering leadership, student-initiative, and collaboration.
            </p>
            <p className="font-semibold">Please consider supporting EAF and its mission.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5 sm:pl-[80px]">
          <DonateButton />
          <LinkButton href={EAF_VOLUNTEER_URL}>Volunteer with EAF</LinkButton>
        </div>
      </div>
    </section>
  );
}

const TILE = 'flex h-16 w-full items-center justify-center rounded-xl';

/**
 * How many tiles fit across a tier's row. The row is a CSS grid that fits
 * as many 9rem columns as it can (6.75rem on phones, so two fit), so this reads the column count back
 * from the browser and follows it as the window resizes. 1 where there's no
 * layout (tests).
 */
function useGridColumns(ref: RefObject<HTMLElement>): number {
  const [columns, setColumns] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const n = getComputedStyle(el).gridTemplateColumns.split(' ').filter((c) => c.endsWith('px')).length;
      setColumns(Math.max(1, n));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return columns;
}

/**
 * A tier's logos, then open spots filling out the last row so every row is
 * full (a whole row of them when the tier is empty or its logos end a row).
 * Only the first open spot is announced to screen readers; the rest repeat it.
 */
function TierRow({ tier, sponsors, solid }: { tier: SponsorTierName; sponsors: Sponsor[]; solid: boolean }) {
  const ref = useRef<HTMLUListElement>(null);
  const columns = useGridColumns(ref);
  const open = columns - (sponsors.length % columns);
  return (
    <ul
      ref={ref}
      className="mt-3.5 grid grid-cols-[repeat(auto-fill,minmax(6.75rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] sm:gap-4"
      aria-label={`${tier} sponsors`}
    >
      {sponsors.map((s) => (
        <li key={s.name}>
          <SponsorLogo sponsor={s} />
        </li>
      ))}
      {Array.from({ length: open }, (_, k) => (
        <li key={`open-${k}`} aria-hidden={k > 0 || undefined}>
          <OpenSpot tier={tier} solid={solid} first={k === 0} />
        </li>
      ))}
    </ul>
  );
}

/** A sponsor's logo on a white tile, linking straight to their website. */
function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noreferrer"
      title={sponsor.name}
      className={cn(TILE, 'border border-black/5 bg-white px-3 py-2 shadow-sm transition-transform hover:-translate-y-0.5')}
    >
      <img src={sponsor.logo} alt={sponsor.name} loading="lazy" className="max-h-full max-w-full object-contain" />
    </a>
  );
}

/**
 * An open spot in a tier; it emails EAF about sponsoring at that level. The
 * first open spot in a tier says "Your company logo could go here"; the rest
 * are quieter empty slots with a small +, so a row of them doesn't repeat
 * the same words.
 */
function OpenSpot({ tier, solid, first }: { tier: SponsorTierName; solid: boolean; first: boolean }) {
  const subject = encodeURIComponent(`${tier} sponsorship, Emerald Summit '27`);
  return (
    <a
      href={`mailto:${SPONSOR_EMAIL}?subject=${subject}`}
      aria-label={first ? `Your company logo could go here: become a ${tier} sponsor` : undefined}
      title={first ? undefined : `Your company logo could go here: become a ${tier} sponsor`}
      tabIndex={first ? undefined : -1}
      className={cn(
        TILE,
        'border-dashed px-3 text-center transition-colors',
        first ? 'border-[1.5px] text-[12px] font-semibold leading-tight' : 'border',
        solid
          ? first
            ? 'border-white/45 text-white/85 hover:border-white/75 hover:text-white'
            : 'border-white/20 text-white/35 hover:border-white/50 hover:text-white/70'
          : first
            ? 'border-emerald/40 text-emerald/85 hover:border-emerald/65 hover:text-emerald'
            : 'border-emerald/20 text-emerald/35 hover:border-emerald/45 hover:text-emerald/70',
      )}
    >
      {first ? 'Your company logo could go here' : <Plus className="h-4 w-4" aria-hidden />}
    </a>
  );
}

export function SponsorsCard({ sponsors = SPONSORS }: { sponsors?: Sponsor[] }) {
  return (
    <section aria-labelledby="sponsors">
      <SectionTitle id="sponsors">Sponsors</SectionTitle>
      <div className="glass rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <p className="flex-1 text-[14.5px] leading-relaxed text-muted-foreground">
            Local businesses and organizations help make the Summit happen. Funds go through EAF, so
            sponsorships are fully tax-deductible.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <LinkButton href={`mailto:${SPONSOR_EMAIL}`} primary icon={Mail}>Become a sponsor</LinkButton>
            <LinkButton href={SPONSORSHIP_DETAILS_URL}>Sponsorship details</LinkButton>
          </div>
        </div>
        <ol className="mt-6 flex flex-col items-center gap-2" aria-label="Sponsor tiers, highest first">
          {SPONSOR_TIERS.map((t, i) => {
            const step = TIER_STEPS[i];
            const inTier = sponsors.filter((s) => s.tier === t.name);
            return (
              <li
                key={t.name}
                aria-label={t.name}
                className={cn('w-full rounded-2xl px-4 py-3.5 sm:px-5', step.width, step.band)}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={cn(
                      'mt-0.5 font-mono text-[12px] font-semibold tabular-nums',
                      step.solid ? 'text-white/60' : 'text-emerald/70',
                    )}
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-display text-[16px] font-bold">{t.name}</span>
                      <span
                        className={cn(
                          'font-mono text-[12.5px] font-medium tabular-nums',
                          step.solid ? 'text-white/85' : 'text-emerald',
                        )}
                      >
                        {t.amount}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-0.5 text-[12.5px] leading-snug',
                        step.solid ? 'text-white/75' : 'text-muted-foreground',
                      )}
                    >
                      {t.perks}
                    </p>
                    <TierRow tier={t.name} sponsors={inTier} solid={step.solid} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

const LEAD_DEVELOPERS = ['Arjun Mahajan', 'Akhil Muthyala'];
const DEVELOPERS_AND_TESTERS = ['Nithali Anand', 'Arush Singh', 'Guhan Bala', 'Deep Shah'];

function joinNames(names: string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function AboutAppCard() {
  return (
    <section aria-labelledby="about-app">
      <SectionTitle id="about-app">About the app</SectionTitle>
      <div className="glass rounded-3xl p-5 sm:p-6">
        <p className="text-[14.5px] leading-relaxed">
          This app has been 100% built by Emerald High School students.
        </p>
        <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Lead developers</dt>
            <dd className="mt-1 font-semibold">{joinNames(LEAD_DEVELOPERS)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Developers and testers</dt>
            <dd className="mt-1 font-semibold">{joinNames(DEVELOPERS_AND_TESTERS)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
