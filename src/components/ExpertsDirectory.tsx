// The Experts page's list (Nov 23, 2026), on the public /experts page and
// Summit '27's Experts tab. It fills in by itself from public_experts: every
// approved expert who serves in at least one track, in name order. Each card's
// See more opens the whole profile, with their tracks. Once experts span more
// than one discipline, chips filter by discipline.
import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTheme } from '../context/ThemeContext';
import { disciplineByName } from '../models/disciplines';
import { vibeFor } from '../models/verseVibes';
import { fetchPublicExperts, type PublicExpert } from '../services/experts';
import { ExpertCard, ExpertProfileDialog } from './session/SessionExperts';

/** The line under the Experts heading, on /experts and Summit '27. */
export const EXPERTS_INTRO = 'Industry professionals, educators and mentors give their time to work with students in the tracks. Meet the experts at Emerald Summit ’27.';
export const EXPERTS_EMPTY = 'Our experts will show up here as they sign up for tracks. Check back soon.';
export const EXPERTS_ERROR = "We couldn't load the experts. Refresh the page to try again.";

export default function ExpertsDirectory() {
  const { theme } = useTheme();
  const accent = vibeFor(null, theme).accent;
  const [experts, setExperts] = useState<PublicExpert[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [open, setOpen] = useState<PublicExpert | null>(null);

  useEffect(() => {
    let live = true;
    fetchPublicExperts()
      .then((list) => { if (live) setExperts(list); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  // The disciplines the experts serve in, in the usual discipline order.
  const disciplines = useMemo(() => {
    const ids = new Set((experts ?? []).flatMap((e) => e.tracks.map((t) => t.discipline)));
    return [...ids]
      .map((id) => ({ id, label: disciplineByName(id)?.label ?? id }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [experts]);

  if (failed) return <p role="alert" className="text-[15px] text-muted-foreground">{EXPERTS_ERROR}</p>;
  if (experts == null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading experts">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[112px] rounded-2xl" />)}
      </div>
    );
  }
  if (experts.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground sm:p-8">
        <p className="max-w-2xl text-[15px] leading-relaxed">{EXPERTS_EMPTY}</p>
      </div>
    );
  }

  const shown = discipline ? experts.filter((e) => e.tracks.some((t) => t.discipline === discipline)) : experts;
  const chip = (active: boolean) => cn(
    'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
    active ? 'border-transparent bg-emerald text-white' : 'border-border bg-card text-muted-foreground hover:text-foreground',
  );

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted-foreground">
        {experts.length === 1 ? '1 expert is' : `${experts.length} experts are`} sharing their time with Summit students this year.
      </p>
      {disciplines.length > 1 && (
        <div role="group" aria-label="Filter by discipline" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button type="button" aria-pressed={discipline == null} onClick={() => setDiscipline(null)} className={chip(discipline == null)}>All</button>
          {disciplines.map((d) => (
            <button key={d.id} type="button" aria-pressed={discipline === d.id} onClick={() => setDiscipline(d.id)} className={chip(discipline === d.id)}>
              {d.label}
            </button>
          ))}
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((e) => <ExpertCard key={e.id} expert={e} accent={accent} onSeeMore={() => setOpen(e)} />)}
      </ul>
      <ExpertProfileDialog expert={open} accent={accent} onClose={() => setOpen(null)} />
    </div>
  );
}
