// The Summit '27 page (/summit-27/:tab), inside the signed-in portal: one
// sidebar tab, with Keynote, Team and Sponsors as tabs across the top of the
// page. Opening it from the sidebar plays the intro (Summit27Intro.tsx, run
// from above the routes), whose logo lands in Support EAF (Donate and
// Volunteer with EAF), under every tab. Sponsors stay off the public site:
// the organizers don't want unpaid sponsors getting free advertising.
import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { Handshake, Keynote, Plus, Team, type AppIcon } from '@/components/icons';
import AppShell from '../components/AppShell';
import { ROLL_ATTR } from '../components/Summit27Intro';
import { LinkButton, SupportEafCard, ZeffyFormButton } from '../components/home/AboutSections';
import { useRequireProfile } from '../hooks/useRequireProfile';
import { SUMMIT_DATE_LABEL, SUMMIT_HOURS, VENUE } from '../models/summitFacts';
import {
  SPONSORS,
  SPONSOR_FORM_EMBED_URL,
  SPONSOR_FORM_URL,
  SPONSOR_TIERS,
  SPONSORSHIP_DETAILS_URL,
  type Sponsor,
} from '../models/sponsors';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const SUMMIT27_TABS: { id: string; label: string; icon: AppIcon }[] = [
  { id: 'keynote', label: 'Keynote', icon: Keynote },
  { id: 'team', label: 'Team', icon: Team },
  { id: 'sponsors', label: 'Sponsors', icon: Handshake },
];

const HEADING = "Summit '27";

/**
 * The page's one heading, "Summit '27" (no per-tab title: the tabs under it
 * say where you are). Each letter is its own box so the intro can roll them
 * in (`ROLL_ATTR`, Summit27Intro.tsx); otherwise it's plain text.
 */
function Summit27Heading() {
  return (
    <header className="mb-6">
      <h1 aria-label={HEADING} className="font-display text-4xl font-bold text-foreground md:text-5xl">
        <span aria-hidden {...{ [ROLL_ATTR]: '' }} className="inline-block [perspective:700px]">
          {[...HEADING].map((c, i) => (
            <span key={i} className="inline-block origin-bottom whitespace-pre">
              {c}
            </span>
          ))}
        </span>
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
        {SUMMIT_DATE_LABEL} · {SUMMIT_HOURS} · {VENUE}
      </p>
    </header>
  );
}

function ComingSoon({ children }: { children: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <p className="inline-block rounded-full bg-emerald/10 px-3 py-1 text-[12.5px] font-semibold text-emerald">
        Coming soon
      </p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">{children}</p>
    </div>
  );
}

/**
 * Each step of the pyramid, top to bottom: how wide it is from sm up (the
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

const TILE = 'flex h-16 w-full items-center justify-center rounded-xl';

/**
 * How many tiles fit across a tier's row. The row is a CSS grid that fits as
 * many 9rem columns as it can (6.75rem on phones, so two fit), so this reads
 * the column count back from the browser and follows it as the window
 * resizes. 1 where there's no layout (tests).
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
function TierRow({ tier, sponsors, solid, onOpen }: { tier: string; sponsors: Sponsor[]; solid: boolean; onOpen: () => void }) {
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
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            title={s.name}
            className={cn(TILE, 'border border-black/5 bg-white px-3 py-2 shadow-sm transition-transform hover:-translate-y-0.5')}
          >
            <img src={s.logo} alt={s.name} loading="lazy" className="max-h-full max-w-full object-contain" />
          </a>
        </li>
      ))}
      {Array.from({ length: open }, (_, k) => (
        <li key={`open-${k}`} aria-hidden={k > 0 || undefined}>
          <OpenSpot tier={tier} solid={solid} first={k === 0} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

/**
 * An open spot in a tier; it opens the sponsor form, like Become a sponsor.
 * The first open spot in a tier says "Your company logo could go here"; the
 * rest are quieter empty slots with a small +, so a row of them doesn't
 * repeat the same words.
 */
function OpenSpot({ tier, solid, first, onOpen }: { tier: string; solid: boolean; first: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
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
    </button>
  );
}

/**
 * The sponsor tiers as a stepped pyramid, Capstone at the peak and
 * Cornerstone at the base, each with its price, perks and logos, and open
 * spots that open the sponsor form.
 */
export function SponsorTiers({ sponsors = SPONSORS }: { sponsors?: Sponsor[] }) {
  const openForm = useRef<(() => void) | null>(null);
  const onOpen = () => openForm.current?.();
  return (
    <div className="space-y-5">
      <ol className="flex flex-col items-center gap-2" aria-label="Sponsor tiers, highest first">
        {SPONSOR_TIERS.map((t, i) => {
          const step = TIER_STEPS[i];
          const inTier = sponsors.filter((s) => s.tier === t.name);
          return (
            <li key={t.name} aria-label={t.name} className={cn('w-full rounded-2xl px-4 py-3.5 sm:px-5', step.width, step.band)}>
              <div className="flex items-start gap-3.5">
                <span
                  className={cn('mt-0.5 font-mono text-[12px] font-semibold tabular-nums', step.solid ? 'text-white/60' : 'text-emerald/70')}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="font-display text-[16px] font-bold">{t.name}</h3>
                    <span className={cn('font-mono text-[12.5px] font-medium tabular-nums', step.solid ? 'text-white/85' : 'text-emerald')}>
                      {t.amount}
                    </span>
                  </div>
                  <p className={cn('mt-0.5 text-[12.5px] leading-snug', step.solid ? 'text-white/75' : 'text-muted-foreground')}>
                    {t.perks}
                  </p>
                  <TierRow tier={t.name} sponsors={inTier} solid={step.solid} onOpen={onOpen} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2.5">
        <ZeffyFormButton
          label="Become a sponsor"
          dialogTitle="Become a sponsor"
          pageUrl={SPONSOR_FORM_URL}
          embedUrl={SPONSOR_FORM_EMBED_URL}
          icon={Handshake}
          opener={openForm}
        />
        <LinkButton href={SPONSORSHIP_DETAILS_URL}>Sponsorship details</LinkButton>
      </div>
    </div>
  );
}

export default function Summit27Page() {
  const { tab } = useParams();
  const { ready, redirect } = useRequireProfile();
  const current = SUMMIT27_TABS.find((t) => t.id === tab);

  if (redirect) return <Navigate to={redirect} replace />;
  if (!current) return <Navigate to="/summit-27/keynote" replace />;
  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-6 py-16">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <AppShell>
      <Summit27Heading />

      <nav aria-label="Summit '27" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {SUMMIT27_TABS.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            to={`/summit-27/${id}`}
            className={({ isActive }) =>
              cn(
                '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[14px] font-semibold transition-colors',
                isActive
                  ? 'border-emerald text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      {current.id === 'keynote' && <ComingSoon>This year's keynote speaker will be announced soon.</ComingSoon>}
      {current.id === 'team' && (
        <ComingSoon>About Me pages for the students and organizers working on Emerald Summit '27 are coming soon.</ComingSoon>
      )}
      {current.id === 'sponsors' && <SponsorTiers />}

      <hr className="my-8 border-t border-border/80" aria-hidden />

      <SupportEafCard introTarget />
    </AppShell>
  );
}
