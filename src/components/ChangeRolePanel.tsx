// Signed in and picking another role: preview what the switch does to your
// sessions, then confirm. Same steps and words as the app's Change role.
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Loader2 } from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { roleLabelFor, type RoleInfo } from '../models/roles';
import {
  checkRoleEligible,
  describeRoleChange,
  previewRoleChange,
  roleChangeLeadIn,
  roleChangedPath,
  type RoleChangeItem,
} from '../services/roleChange';
import { Button } from '@/components/ui/button';

export default function ChangeRolePanel({
  role,
  autoPreview = false,
  onCancel,
  onDone,
}: {
  role: RoleInfo;
  /** Load the preview straight away (the role was already picked in the change-role popup). */
  autoPreview?: boolean;
  /** Cancel on the preview goes back to the caller instead of the first step. */
  onCancel?: () => void;
  /** Called on Continue, before moving on to the new role's profile page. */
  onDone?: () => void;
}) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [changes, setChanges] = useState<RoleChangeItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = roleLabelFor(profile?.role as string | undefined, profile?.volunteer_subtype);

  const preview = async () => {
    setBusy(true);
    setError(null);
    try {
      await checkRoleEligible(role.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
      return;
    }
    try {
      setChanges(await previewRoleChange(role.name));
    } catch {
      // The app goes ahead with no list when the preview can't load.
      setChanges([]);
    } finally {
      setBusy(false);
    }
  };

  const started = useRef(false);
  useEffect(() => {
    if (!autoPreview || started.current) return;
    started.current = true;
    void preview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPreview]);

  // Like the app, the new role's sign-up questions come next. The role is
  // saved there, by Continue, so Back on that page leaves nothing changed.
  const confirm = () => {
    onDone?.();
    navigate(roleChangedPath(role.name), { state: { from: location.pathname + location.search } });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card px-4 py-4 text-[13px]">
      <p className="text-muted-foreground">
        You're signed in as <span className="font-semibold text-foreground">{current}</span>.
      </p>
      {changes === null && autoPreview && !error ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking what changes…
        </div>
      ) : changes === null ? (
        <Button type="button" onClick={preview} disabled={busy} className="w-full gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
          Change role to {role.label}
        </Button>
      ) : (
        <>
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="font-semibold">Switching to {role.label}</div>
            <p className="mt-2">Next you answer the {role.label} questions. Nothing changes until you finish that page.</p>
            {role.name === 'expert' && (
              <p className="mt-2">
                Expert accounts need an organizer to approve them. Until then, you'll only see a screen
                saying your account is pending approval.
              </p>
            )}
            {changes.length > 0 && (
              <>
                <p className="mt-2">{roleChangeLeadIn(role.name, role.label)}</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {changes.map((c) => <li key={c.sessionId}>{describeRoleChange(c)}</li>)}
                </ul>
                {changes.some((c) => c.from === 'managing') && (
                  <p className="mt-2">
                    The organizers will be told you're no longer managing these sessions, so they can find someone else.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={confirm} disabled={busy} className="flex-1 gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => (onCancel ? onCancel() : setChanges(null))}>Cancel</Button>
          </div>
        </>
      )}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {error && onCancel && changes === null && (
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">Pick another role</Button>
      )}
    </div>
  );
}
