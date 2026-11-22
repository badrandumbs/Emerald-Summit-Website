// "Continue with LinkedIn" for experts. It leaves for LinkedIn and comes back
// to /home, where the profile gate sends a new account to the sign-up questions
// (name and photo already filled in from LinkedIn).
import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';
import LinkedInIcon from './LinkedInIcon';
import { isSupabaseConfigured } from '../lib/supabase';
import { signInWithLinkedIn } from '../services/auth';

export default function LinkedInSignInButton({
  roleName,
  disabled,
  onStart,
}: {
  roleName: string;
  disabled?: boolean;
  onStart?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const start = async () => {
    onStart?.();
    setBusy(true);
    try {
      await signInWithLinkedIn(roleName);
      // The page is leaving for LinkedIn; stay busy.
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };

  // Sized like Google's "large" button beside it (40px high, at most 400px wide).
  return (
    <div className="flex min-h-[44px] w-full items-center justify-center">
      <Button
        type="button"
        onClick={() => void start()}
        disabled={!isSupabaseConfigured || disabled || busy}
        className="h-10 w-full max-w-[400px] gap-2.5 rounded-[4px] bg-[#0A66C2] text-[14px] font-medium text-white hover:bg-[#004182]"
      >
        {busy
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-white"><LinkedInIcon size={14} /></span>}
        Continue with LinkedIn
      </Button>
    </div>
  );
}
