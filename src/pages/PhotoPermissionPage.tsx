// Admin → Photo permission: who did not allow photos (the Code of Conduct's
// "Media Rights and Consent" question), so photographers can leave them out.
// Then who has not answered yet and, collapsed, who allowed them. The app's
// PhotoPermissionScreen.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, RefreshCw, Search } from '@/components/icons';
import { useRequireRole } from '../hooks/useRequireProfile';
import { roleLabelFor } from '../models/roles';
import { fetchPhotoPermissions, type PhotoPermission } from '../services/photoPermission';

const nameOf = (p: PhotoPermission) => p.name.trim() || p.email;
const websiteRole = (role: string) => (role === 'parentSpectator' ? 'attendee' : role);

function Section({ title, tone, people, empty, note, open = true, onCopy }: {
  title: string;
  tone: string;
  people: PhotoPermission[];
  empty: string;
  note?: string;
  open?: boolean;
  onCopy?: () => void;
}) {
  return (
    <details open={open} className="glass rounded-2xl p-4 sm:p-5">
      <summary className={`cursor-pointer text-[15px] font-semibold ${tone}`}>
        {title} ({people.length})
      </summary>
      {note && <p className="mt-1 text-[13px] text-muted-foreground">{note}</p>}
      {people.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border">
            {people.map((p) => (
              <li key={p.userId} className="py-2.5">
                <div className="font-medium">{nameOf(p)}</div>
                <div className="text-[13px] text-muted-foreground">
                  {[roleLabelFor(websiteRole(p.role)), p.school, p.email].filter(Boolean).join(' · ')}
                </div>
              </li>
            ))}
          </ul>
          {onCopy && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onCopy}>
              <Copy className="h-4 w-4" /> Copy names
            </Button>
          )}
        </>
      )}
    </details>
  );
}

export default function PhotoPermissionPage() {
  const { ready, redirect } = useRequireRole(['admin']);
  const [people, setPeople] = useState<PhotoPermission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setError(null);
    fetchPhotoPermissions().then(setPeople).catch(() => setError('Could not load photo permission. Organizers only.'));
  }, []);
  useEffect(() => { if (ready) load(); }, [ready, load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people ?? []).filter((p) => !q || `${p.name} ${p.email} ${p.school ?? ''}`.toLowerCase().includes(q));
  }, [people, query]);

  if (redirect) return <Navigate to={redirect} replace />;
  if (!ready) return <div className="mx-auto max-w-3xl space-y-4 px-6 py-16"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  const notGranted = shown.filter((p) => p.granted === false);
  const notAnswered = shown.filter((p) => p.granted == null);
  const granted = shown.filter((p) => p.granted === true);

  const copyNames = async (list: PhotoPermission[]) => {
    try {
      await navigator.clipboard.writeText(list.map(nameOf).join('\n'));
      toast.success(`Copied ${list.length} ${list.length === 1 ? 'name' : 'names'}`);
    } catch {
      toast.error('Could not copy to the clipboard.');
    }
  };

  return (
    <AppShell>
      <PageHeader label="Organizer" title="Photo permission" actions={
        <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
      } />
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-muted-foreground">
          From the Code of Conduct&rsquo;s &ldquo;Media Rights and Consent&rdquo; question. Experts are not asked, so they are not listed.
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search people"
            placeholder="Search by name, email or school"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!error && people == null && <Skeleton className="h-40 w-full rounded-2xl" />}
        {people != null && (
          <>
            <Section
              title="Did not allow photos"
              tone="text-red-600 dark:text-red-400"
              people={notGranted}
              empty="Nobody has said no to photos."
              onCopy={notGranted.length ? () => void copyNames(notGranted) : undefined}
            />
            <Section
              title="Not answered yet"
              tone="text-muted-foreground"
              people={notAnswered}
              empty="Everyone has answered."
              note="They have not agreed to the current Code of Conduct yet. They will be asked the next time they open the app or the website."
            />
            <Section title="Allowed photos" tone="text-emerald" people={granted} empty="Nobody yet." open={false} />
          </>
        )}
      </div>
    </AppShell>
  );
}
