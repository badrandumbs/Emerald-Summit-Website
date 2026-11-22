// The Summit '27 page (/summit-27/:tab), inside the signed-in portal: its own
// sidebar group with three subtabs, Keynote, Team and Sponsors, plus the same
// tabs across the top of the page for phones. Support EAF (Donate and
// Volunteer with EAF) sits under every subtab. Sponsors stay off the public
// site: the organizers don't want unpaid sponsors getting free advertising.
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { Handshake, Keynote, Mail, Team, type AppIcon } from '@/components/icons';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import { LinkButton, SupportEafCard } from '../components/home/AboutSections';
import { useRequireProfile } from '../hooks/useRequireProfile';
import { SUMMIT_DATE_LABEL, SUMMIT_HOURS, VENUE } from '../models/summitFacts';
import { SPONSORS, SPONSOR_EMAIL, SPONSOR_TIERS, SPONSORSHIP_DETAILS_URL, type Sponsor } from '../models/sponsors';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const SUMMIT27_TABS: { id: string; label: string; title: string; icon: AppIcon }[] = [
  { id: 'keynote', label: 'Keynote', title: 'Keynote', icon: Keynote },
  { id: 'team', label: 'Team', title: "Who's running the Summit?", icon: Team },
  { id: 'sponsors', label: 'Sponsors', title: 'Who helps make the Summit happen?', icon: Handshake },
];

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

export function SponsorTiers({ sponsors = SPONSORS }: { sponsors?: Sponsor[] }) {
  return (
    <div className="space-y-5">
      <ol className="grid gap-3 md:grid-cols-2" aria-label="Sponsor tiers, highest first">
        {SPONSOR_TIERS.map((tier) => {
          const here = sponsors.filter((s) => s.tier === tier.name);
          return (
            <li key={tier.name} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-bold">{tier.name}</h3>
                <span className="font-semibold tabular-nums text-emerald">{tier.amount}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{tier.perks}</p>
              <div className="mt-auto pt-4">
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
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2.5">
        <LinkButton
          href={`mailto:${SPONSOR_EMAIL}?subject=${encodeURIComponent("Sponsoring Emerald Summit '27")}`}
          primary
          icon={Mail}
        >
          Become a sponsor
        </LinkButton>
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
      <PageHeader label="Summit '27" title={current.title} sub={`${SUMMIT_DATE_LABEL} · ${SUMMIT_HOURS} · ${VENUE}`} />

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

      <SupportEafCard />
    </AppShell>
  );
}
