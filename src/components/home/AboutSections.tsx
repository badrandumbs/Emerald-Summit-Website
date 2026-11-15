// Home's Support EAF, Sponsors and About the app sections (website only for
// now). EAF links and the sponsor tiers come from EAF's real site,
// ehsacademics.org (Initiatives → Emerald Summit '27 → Sponsor; checked
// Nov 14, 2026). The old Google Sites page (sites.google.com/view/
// ehs-academic-foundation) is out of date: don't use it.
import { ArrowRight, HeartHandshake, Mail, type AppIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

const EAF_SITE = 'https://www.ehsacademics.org';
/** The Donate button on EAF's Emerald Summit '27 page goes to this Zeffy form. */
export const EAF_DONATE_URL = 'https://www.zeffy.com/en-US/donation-form/6938c617-88ca-483d-ab7d-997e94ed8b6c';
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
  url?: string;
}

/** This year's sponsors. Add one here and it shows up under its tier. */
export const SPONSORS: Sponsor[] = [];

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
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors',
        primary
          ? 'bg-emerald text-white hover:bg-emerald-deep'
          : 'border border-border bg-card hover:border-emerald/40',
      )}
    >
      {children}
      <Icon className={cn('h-3.5 w-3.5', external && Icon === ArrowRight && '-rotate-45')} aria-hidden />
    </a>
  );
}

export function SupportEafCard() {
  return (
    <section aria-labelledby="support-eaf">
      <SectionTitle id="support-eaf">Support EAF</SectionTitle>
      <div className="rounded-3xl border border-emerald/20 bg-gradient-to-br from-emerald/10 to-emerald/[0.03] p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald text-white">
            <HeartHandshake className="h-5 w-5" />
          </span>
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
        <div className="mt-5 flex flex-wrap gap-2.5 sm:pl-[60px]">
          <LinkButton href={EAF_DONATE_URL} primary>Donate</LinkButton>
          <LinkButton href={EAF_VOLUNTEER_URL}>Volunteer with EAF</LinkButton>
        </div>
      </div>
    </section>
  );
}

function SponsorChip({ sponsor, solid }: { sponsor: Sponsor; solid: boolean }) {
  const cls = cn(
    'inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold',
    solid ? 'bg-white/15 text-white' : 'border border-border bg-card',
  );
  if (!sponsor.url) return <span className={cls}>{sponsor.name}</span>;
  return (
    <a href={sponsor.url} target="_blank" rel="noreferrer" className={cn(cls, 'hover:underline')}>
      {sponsor.name}
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
            {sponsors.length === 0 && ' Sponsors are listed here by tier as they sign on.'}
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
                    {inTier.length > 0 && (
                      <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label={`${t.name} sponsors`}>
                        {inTier.map((s) => (
                          <li key={s.name}>
                            <SponsorChip sponsor={s} solid={step.solid} />
                          </li>
                        ))}
                      </ul>
                    )}
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
