// Summit-wide metrics for admins, ported from the app's metrics_screen.dart.
// fetch_summit_metrics returns no names or contact details, and only to admins.
// The audience charts count only people registered for at least one track:
// an account with no track sign-up is not counted anywhere below the expert
// section.
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireRole } from '../hooks/useRequireProfile';
import { USER_DISCIPLINES } from '../models/disciplines';
import { MOCK_SESSIONS } from '../models/sessions';
import {
  compareGrades, countBy, crossTab, expertSummary, NO_SCHOOL_LABEL, registeredPeople, type SummitMetrics,
} from '../models/metrics';
import { fetchExpertRequests, fetchSummitMetrics } from '../services/organizer';
import { contentSource, useSummitContent } from '../services/summitContent';
import { BarList, FilterChips, HeatTable, MetricsSection, PieChart, StatTiles } from '../components/MetricsBits';

type Who = 'participants' | 'parents' | 'everyone';
const NOUN: Record<Who, string> = { participants: 'participants', parents: 'parents or spectators', everyone: 'people' };

export default function MetricsPage() {
  const { ready, redirect } = useRequireRole(['admin']);
  const [data, setData] = useState<SummitMetrics | null>(null);
  // Experts waiting for approval; null if that list could not load.
  const [waiting, setWaiting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [who, setWho] = useState<Who>('participants');

  const load = useCallback(() => {
    setError(null);
    fetchSummitMetrics().then(setData).catch(() => setError("Couldn't load metrics. Try again."));
    fetchExpertRequests().then((r) => setWaiting(r.length)).catch(() => setWaiting(null));
  }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);

  if (redirect) return <Navigate to={redirect} replace />;
  if (!ready) return <div className="mx-auto max-w-3xl space-y-4 px-6 py-16"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  return (
    <AppShell>
      <PageHeader label="Organizer" title="Metrics" />
      <div className="mx-auto max-w-4xl space-y-10">
        {error ? (
          <div className="space-y-2 text-sm"><p role="alert" className="text-destructive">{error}</p><Button variant="outline" size="sm" onClick={load}>Try again</Button></div>
        ) : data == null ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <Experts data={data} waiting={waiting} />
            <div className="space-y-6 border-t border-border pt-8">
              <div className="space-y-1">
                <h2 className="font-display text-xl font-bold">Who is registered</h2>
                <p className="text-sm text-muted-foreground">
                  Only people registered for at least one track. Accounts that signed up but have not joined a track are not counted.
                </p>
              </div>
              <FilterChips<Who>
                options={[['participants', 'Participants'], ['parents', 'Parents & spectators'], ['everyone', 'Everyone']]}
                selected={who}
                onSelect={setWho}
              />
              <Charts data={data} who={who} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Experts({ data, waiting }: { data: SummitMetrics; waiting: number | null }) {
  useSummitContent();
  // Keynotes have no experts. The bundled sample sessions are not real tracks.
  const sessions = contentSource() === 'database' ? MOCK_SESSIONS.filter((s) => s.track !== 'keynote') : null;
  const e = expertSummary(data, sessions?.map((s) => s.id) ?? []);
  const uncovered = sessions?.filter((s) => e.sessionsWithoutExpert.includes(s.id)) ?? [];
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold">Experts</h2>
      <StatTiles stats={[
        ['Expert accounts', String(e.accounts)],
        ['Approved', waiting == null ? '–' : String(Math.max(0, e.accounts - waiting))],
        ['Waiting for approval', waiting == null ? '–' : String(waiting)],
        ['Serving in a track', String(e.serving)],
        ['Expert sign-ups', String(e.signUps)],
        ['Tracks with no expert', sessions == null ? '–' : String(uncovered.length)],
      ]} />
      {waiting != null && waiting > 0 && (
        <p className="-mt-2 text-sm">
          <Link to="/admin/experts" className="font-medium text-emerald hover:underline">Review waiting experts</Link>
        </p>
      )}
      <MetricsSection title="Experts by discipline">
        <p className="-mt-2 text-xs text-muted-foreground">Experts signed up to serve in at least one track in each. Someone serving in two Tech tracks counts once.</p>
        <BarList rows={e.byDiscipline} total={e.serving} emptyText="No experts have signed up to serve in a track yet." />
      </MetricsSection>
      {uncovered.length > 0 && (
        <MetricsSection title="Tracks with no expert yet">
          <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
            {uncovered.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 px-3 py-2">
                <Link to={`/sessions/${s.id}`} className="min-w-0 truncate hover:underline">{s.title}</Link>
                <span className="shrink-0 text-muted-foreground">{s.disciplineName ?? s.track}</span>
              </li>
            ))}
          </ul>
        </MetricsSection>
      )}
    </div>
  );
}

function Charts({ data, who }: { data: SummitMetrics; who: Who }) {
  const noun = NOUN[who];
  const audience = data.people.filter((p) =>
    who === 'participants' ? p.role === 'participant' : who === 'parents' ? p.role === 'parentSpectator' : true);
  const inAudience = new Set(audience.map((p) => p.id));
  // Experts leading a track are not showing interest in it.
  const regs = data.registrations.filter((r) => inAudience.has(r.userId) && r.type !== 'expert');
  const people = registeredPeople(audience, regs);
  const byId = new Map(people.map((p) => [p.id, p]));
  const schools = new Set(people.map((p) => p.school).filter((s) => s !== NO_SCHOOL_LABEL));
  const grades = [...new Set(people.map((p) => p.grade))].sort(compareGrades);
  const none = `No ${noun} have registered for a track yet.`;
  return (
    <div className="space-y-8">
      <StatTiles stats={[
        ['Registered for a track', String(people.length)],
        ['Schools', String(schools.size)],
        ['Track sign-ups', String(regs.length)],
      ]} />
      <MetricsSection title="Sign-ups by school">
        <p className="-mt-2 text-xs text-muted-foreground">
          People registered for at least one track, by the school they picked. Accounts with no track sign-up are not counted.
        </p>
        <PieChart
          rows={countBy(people.map((p) => [p.school, p.id]), { last: NO_SCHOOL_LABEL })}
          total={people.length}
          emptyText={none}
          mutedLabel={NO_SCHOOL_LABEL}
        />
      </MetricsSection>
      <MetricsSection title="Disciplines by school">
        <p className="-mt-2 text-xs text-muted-foreground">
          People from each school registered for at least one track in a discipline. Someone in two Tech tracks counts once under Tech, so a row total can be less than its cells added up.
        </p>
        <HeatTable
          table={crossTab(regs.map((r) => [byId.get(r.userId)!.school, r.disciplineName, r.userId]), USER_DISCIPLINES.map((d) => d.label), NO_SCHOOL_LABEL)}
          cornerLabel="School"
          emptyText={none}
        />
      </MetricsSection>
      <MetricsSection title="Interest by discipline">
        <p className="-mt-2 text-xs text-muted-foreground">People registered for at least one track in each.</p>
        <BarList rows={countBy(regs.map((r) => [r.disciplineName, r.userId]))} total={people.length} emptyText={none} />
      </MetricsSection>
      {who !== 'parents' && (
        <>
          <MetricsSection title="Grades by school">
            <p className="-mt-2 text-xs text-muted-foreground">Everyone registered for at least one track, by school and grade.</p>
            <HeatTable table={crossTab(people.map((p) => [p.school, p.grade, p.id]), grades, NO_SCHOOL_LABEL)} cornerLabel="School" emptyText={none} />
          </MetricsSection>
          <MetricsSection title="Sign-ups by grade">
            <p className="-mt-2 text-xs text-muted-foreground">Everyone registered for at least one track, by grade.</p>
            <BarList rows={countBy(people.map((p) => [p.grade, p.id]), { compare: compareGrades })} total={people.length} emptyText={none} />
          </MetricsSection>
        </>
      )}
    </div>
  );
}
