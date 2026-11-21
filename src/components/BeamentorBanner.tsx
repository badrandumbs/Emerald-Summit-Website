// Shown across the top of the app to an expert who ticked BeAMentor and is
// waiting for an organizer to verify it. Once they press X it never comes
// back: the dismissal is saved on their account (auth user_metadata), so a
// reload, another browser or another device keeps it hidden. A copy in
// localStorage hides it at once, before the account save finishes.
import { useState } from 'react';
import { Clock, X } from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { awaitingBeamentorVerification } from '../models/beamentor';
import { supabase } from '../lib/supabase';

/** The user_metadata flag set when an expert closes the banner. */
export const BANNER_DISMISSED_FLAG = 'beamentor_banner_dismissed';

const dismissedKey = (userId: string) => `${BANNER_DISMISSED_FLAG}:${userId}`;
// Used when storage is blocked, so the X still holds for this tab.
const dismissedInMemory = new Set<string>();

function dismissedOnThisBrowser(userId: string): boolean {
  if (dismissedInMemory.has(userId)) return true;
  try {
    return localStorage.getItem(dismissedKey(userId)) === '1';
  } catch {
    return false;
  }
}

export default function BeamentorBanner() {
  const { session, profile } = useAuth();
  const userId = profile?.id ?? '';
  const onAccount = session?.user?.user_metadata?.[BANNER_DISMISSED_FLAG] === true;
  const [dismissed, setDismissed] = useState(() => (userId ? dismissedOnThisBrowser(userId) : false));

  if (!userId || onAccount || dismissed || !awaitingBeamentorVerification(profile)) return null;

  const dismiss = () => {
    dismissedInMemory.add(userId);
    try {
      localStorage.setItem(dismissedKey(userId), '1');
    } catch {
      // Storage blocked: the in-memory copy covers this tab.
    }
    setDismissed(true);
    // Best effort: if this fails, this browser still remembers.
    void supabase?.auth.updateUser({ data: { [BANNER_DISMISSED_FLAG]: true } }).catch(() => {});
  };

  return (
    <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="min-w-0 flex-1 leading-relaxed">
        <span className="font-semibold">BeAMentor submitted.</span>{' '}
        It is waiting to be verified by a Summit organizer. You will get a notification once it is verified.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
