// Expert verification for admins. Every expert in the app has ticked that they
// submitted BeAMentor, so there are two tabs: not verified and verified. Verify and
// Decline call review_expert, which refuses anyone but an admin; verifying
// sends the expert a notice (app repo expert_beamentor.sql). Until that SQL
// runs, the page falls back to the old pending list (fetch_expert_requests).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, CheckCircle2, Clock, Mail, Phone, UserRound } from '@/components/icons';
import { useRequireRole } from '../hooks/useRequireProfile';
import { useAuth } from '../context/AuthContext';
import { formatDeadline } from '../models/registration';
import {
  fetchExpertDashboard, fetchExpertRequests, markExpertQueueSeen, reviewExpert,
  type ExpertDashboardRow, type ExpertStage,
} from '../services/organizer';
import { cn } from '@/lib/utils';

const TABS: { stage: ExpertStage; label: string; empty: string }[] = [
  { stage: 'not_verified', label: 'Not verified', empty: 'Every expert is verified.' },
  { stage: 'verified', label: 'Verified', empty: 'No experts verified yet.' },
];

const when = (iso: string | null) => (iso ? formatDeadline(new Date(iso)) : null);

/** The old pending list, shaped like the dashboard, for before the SQL runs. */
async function loadExperts(): Promise<ExpertDashboardRow[]> {
  try {
    return await fetchExpertDashboard();
  } catch {
    const old = await fetchExpertRequests();
    return old.map((r) => ({
      ...r, title: null, company: null, photoUrl: null, stage: 'not_verified' as const,
      beamentorSubmittedAt: null, verifiedAt: null, verifiedByName: null,
    }));
  }
}

export default function ExpertApprovalsPage() {
  const { ready, redirect } = useRequireRole(['admin']);
  const { refreshProfile } = useAuth();
  const [experts, setExperts] = useState<ExpertDashboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ExpertStage>('not_verified');
  const [declining, setDeclining] = useState<ExpertDashboardRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    loadExperts().then(setExperts).catch(() => setError("Couldn't load the experts."));
  }, []);
  useEffect(() => {
    if (!ready) return;
    load();
    // Opening the page clears the admin's badge, like opening Profile in the app.
    void markExpertQueueSeen().then(() => refreshProfile()).catch(() => {});
  }, [ready, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c: Record<ExpertStage, number> = { not_verified: 0, verified: 0 };
    for (const e of experts ?? []) c[e.stage] += 1;
    return c;
  }, [experts]);

  if (redirect) return <Navigate to={redirect} replace />;
  if (!ready) return <div className="mx-auto max-w-3xl space-y-4 px-6 py-16"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  const review = async (r: ExpertDashboardRow, approve: boolean) => {
    setDeclining(null);
    setBusy(r.userId);
    const name = r.fullName || r.email;
    try {
      const done = await reviewExpert(r.userId, approve);
      if (!done) {
        toast(`${name} was already reviewed or changed roles.`);
        load();
      } else if (approve) {
        setExperts((list) => list?.map((x) => x.userId === r.userId
          ? { ...x, stage: 'verified', verifiedAt: new Date().toISOString(), verifiedByName: 'you' }
          : x) ?? list);
        toast(`Verified ${name}. They've been notified.`);
      } else {
        setExperts((list) => list?.filter((x) => x.userId !== r.userId) ?? list);
        toast(`Declined ${name}.`);
      }
    } catch {
      toast.error("Couldn't save that. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const shown = (experts ?? []).filter((e) => e.stage === tab);
  const current = TABS.find((t) => t.stage === tab)!;

  return (
    <AppShell>
      <PageHeader label="Organizer" title="Expert verification" />
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">
          Experts get into the app by ticking that they submitted BeAMentor. When BeAMentor shows them cleared for EHS,
          and they are who they say they are, press Verify. They get a notification.
        </p>

        <div role="tablist" aria-label="Experts" className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.stage}
              type="button"
              role="tab"
              aria-selected={tab === t.stage}
              onClick={() => setTab(t.stage)}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.stage ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}{experts != null && <span className="ml-1.5 text-xs text-muted-foreground">{counts[t.stage]}</span>}
            </button>
          ))}
        </div>

        {error ? (
          <div className="space-y-2 text-sm"><p role="alert" className="text-destructive">{error}</p><Button variant="outline" size="sm" onClick={load}>Try again</Button></div>
        ) : experts == null ? (
          <Skeleton className="h-32 w-full" />
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{current.empty}</p>
        ) : shown.map((r) => (
          <article key={r.userId} className="rounded-2xl border border-border p-4">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/60">
                {r.photoUrl
                  ? <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />
                  : <UserRound className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{r.fullName || 'No name given'}</h2>
                {(r.title || r.company) && <p className="text-sm">{[r.title, r.company].filter(Boolean).join(' · ')}</p>}
                {r.expertise && <p className="text-sm text-emerald">{r.expertise}</p>}
                {r.bio && <p className="mt-1.5 text-sm">"{r.bio}"</p>}
                <p className="mt-1.5 flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {r.email}</p>
                {r.phone && <p className="mt-1 flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {r.phone}</p>}
                <StageLine row={r} />
              </div>
            </div>
            {r.stage !== 'verified' && (
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" disabled={busy === r.userId} onClick={() => setDeclining(r)}>Decline</Button>
                <Button disabled={busy === r.userId} onClick={() => void review(r, true)} className="bg-emerald text-white hover:bg-emerald-deep"><Check className="h-4 w-4" /> Verify</Button>
              </div>
            )}
          </article>
        ))}
      </div>
      <Dialog open={declining != null} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline {declining?.fullName || declining?.email}?</DialogTitle>
            <DialogDescription>
              Their account becomes a participant account, and any sessions they signed up for as an expert are removed. They'll see a note saying their expert request was not approved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => declining && void review(declining, false)}>Decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StageLine({ row }: { row: ExpertDashboardRow }) {
  const cls = 'mt-2 flex items-center gap-1.5 text-xs text-muted-foreground';
  if (row.stage === 'verified') {
    return (
      <p className={cls}>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald" />
        Verified {when(row.verifiedAt)}{row.verifiedByName ? ` by ${row.verifiedByName}` : ''}
      </p>
    );
  }
  if (row.beamentorSubmittedAt) {
    return <p className={cls}><Clock className="h-3.5 w-3.5" /> Submitted BeAMentor {when(row.beamentorSubmittedAt)}</p>;
  }
  return row.requestedAt ? <p className={cls}>Signed up {when(row.requestedAt)}</p> : null;
}
