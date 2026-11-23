// The Summit '27 page (/summit-27/:tab), inside the signed-in portal: one
// sidebar tab, with Keynote, Team and Sponsors as tabs across the top of the
// page. Opening it from the sidebar plays the intro (Summit27Intro.tsx, run
// from above the routes), whose logo lands in Support EAF (Donate and
// Volunteer with EAF), under every tab. Sponsors stay off the public site:
// the organizers don't want unpaid sponsors getting free advertising.
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { Handshake, Keynote, Team, type AppIcon } from '@/components/icons';
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
 * Five bars stepping up, filled up to the tier's level (Capstone all five,
 * Cornerstone one), so the ranking reads at a glance. Decorative: the badge
 * and the "Tier n of 5" label carry it for screen readers.
 */
function TierMeter({ level, of }: { level: number; of: number }) {
  return (
    <span aria-hidden className="flex items-end gap-[3px]">
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={cn('w-[5px] rounded-sm', i < level ? 'bg-emerald' : 'bg-border')}
          style={{ height: 6 + i * 3 }}
        />
      ))}
    </span>
  );
}

export function SponsorTiers({ sponsors = SPONSORS }: { sponsors?: Sponsor[] }) {
  const count = SPONSOR_TIERS.length;
  return (
    <div className="space-y-5">
      <ol className="space-y-3" aria-label="Sponsor tiers, highest first">
        {SPONSOR_TIERS.map((tier, i) => {
          const here = sponsors.filter((s) => s.tier === tier.name);
          const rank = i + 1;
          return (
            <li
              key={tier.name}
              className={cn(
                'flex gap-4 rounded-2xl border bg-card p-5',
                rank === 1 ? 'border-emerald/60 ring-1 ring-emerald/20' : 'border-border',
              )}
            >
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald font-display text-lg font-bold tabular-nums text-white"
              >
                {rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold leading-tight">{tier.name}</h3>
                    <p className="mt-1 flex items-center gap-2 text-[12.5px] font-semibold text-muted-foreground">
                      <TierMeter level={count - i} of={count} />
                      Tier {rank} of {count}
                      {rank === 1 && <span className="text-emerald">· Top tier</span>}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums text-emerald">{tier.amount}</span>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{tier.perks}</p>
                <div className="pt-3">
                  {here.length > 0 ? (
                    <ul className="flex flex-wrap gap-2" aria-label={`${tier.name} sponsors`}>
                      {here.map((s) => (
                        <li key={s.name}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            title={s.name}
                            className="flex h-12 items-center rounded-lg bg-white px-3 ring-1 ring-border"
                          >
                            <img src={s.logo} alt={s.name} loading="lazy" className="max-h-8 w-auto" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] font-medium text-muted-foreground">Open</p>
                  )}
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
