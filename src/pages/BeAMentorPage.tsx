// The expert's last sign-up step, after the Guest Expert Policy: apply for
// BeAMentor clearance (a Dublin Unified requirement), then tick that it was
// submitted. Ticking gives full access; a banner then waits for an organizer
// to verify it (models/beamentor.ts, app repo expert_beamentor.sql).
import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, Info, Mail } from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { markBeamentorSubmitted, needsProfileSetup, signOut } from '../services/auth';
import { needsCodeOfConduct } from '../models/codeOfConduct';
import {
  BEAMENTOR_CHECKBOX, BEAMENTOR_CONTACT_EMAIL, BEAMENTOR_PAST_EXPERT, BEAMENTOR_GUIDE_URL, BEAMENTOR_STEPS,
  BEAMENTOR_TIMING, BEAMENTOR_URL, needsBeamentor,
} from '../models/beamentor';
import AuthLayout, { AUTH_ENTER, authStagger } from '../components/AuthLayout';
import { roleByName, USER_ROLES } from '../models/roles';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

export default function BeAMentorPage() {
  const { session, profile, loadingProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const doneRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLButtonElement>(null);

  // Past experts who already applied go straight to the box.
  const skipToBox = () => {
    doneRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    boxRef.current?.focus({ preventScroll: true });
  };

  if (!loadingProfile && session == null) return <Navigate to="/home" replace />;
  if (loadingProfile || profile == null) {
    return <div className="mx-auto max-w-xl space-y-4 px-6 py-16"><Skeleton className="h-10 w-64" /><Skeleton className="h-64 w-full rounded-2xl" /></div>;
  }
  if (needsProfileSetup(profile) || needsCodeOfConduct(profile)) return <Navigate to="/profile" replace />;
  if (!needsBeamentor(profile)) return <Navigate to="/home" replace />;

  const role = roleByName('expert') ?? USER_ROLES[0];

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setIsSigningOut(false);
      toast.error("Couldn't sign out. Try again.");
    }
  };

  const save = async () => {
    if (!submitted) return;
    setError(null);
    setSaving(true);
    try {
      await markBeamentorSubmitted();
      await refreshProfile();
      navigate('/home', { replace: true });
    } catch {
      setError("Couldn't save that. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      fullScreen
      accent={role.color}
      icon={role.icon}
      eyebrow="Set up your profile"
      title={role.label}
      backLabel={isSigningOut ? 'Signing out…' : 'Sign out'}
      onBack={() => void handleSignOut()}
    >
      <div style={authStagger(1)} className={AUTH_ENTER}>
        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight">BeAMentor clearance</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Dublin Unified School District requires every adult volunteer on campus to be cleared through BeAMentor,
          and that includes Summit experts. Apply now so you are cleared before the Summit.
        </p>
        <div className="mt-5 flex max-w-2xl gap-3 rounded-xl border border-emerald/30 bg-emerald/5 px-4 py-3.5 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
          <div>
            <p className="font-semibold">Been a Summit expert before?</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">{BEAMENTOR_PAST_EXPERT}</p>
            <button
              type="button"
              onClick={skipToBox}
              className="mt-2 font-semibold text-emerald underline-offset-4 hover:underline"
            >
              Skip to the box
            </button>
          </div>
        </div>
      </div>

      <form
        className="animate-fade-up mt-10 space-y-8 motion-reduce:animate-none"
        style={{ animationDelay: '90ms' }}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        <section className="space-y-5 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">How to apply</h2>
          <ol className="space-y-3 pl-4">
            {BEAMENTOR_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-[15px] leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-[12px] font-bold text-emerald">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="ml-4 flex gap-2 rounded-xl bg-secondary/60 px-3.5 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
            {BEAMENTOR_TIMING}
          </p>
          <div className="flex flex-col gap-2 pl-4 sm:flex-row">
            <Button asChild className="gap-2 bg-emerald text-white hover:bg-emerald-deep">
              <a href={BEAMENTOR_URL} target="_blank" rel="noopener noreferrer">
                Open BeAMentor <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a href={BEAMENTOR_GUIDE_URL} target="_blank" rel="noopener noreferrer">
                Step-by-step guide with screenshots <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <p className="pl-4 text-sm text-muted-foreground">
            Questions?{' '}
            <a href={`mailto:${BEAMENTOR_CONTACT_EMAIL}`} className="inline-flex items-center gap-1 font-semibold text-emerald hover:underline">
              <Mail className="h-3.5 w-3.5" /> {BEAMENTOR_CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <section ref={doneRef} className="scroll-mt-24 space-y-4 border-t border-border pt-8">
          <h2 className="font-display text-2xl font-bold tracking-tight">When you are done</h2>
          <p className="pl-4 text-[15px] text-muted-foreground">
            Come back here and tick the box. If you applied for a past Summit, tick it now. You can use the app straight away,
            and a Summit organizer will verify your clearance.
          </p>
          <label className="flex cursor-pointer items-start gap-3 pl-4 text-base">
            <Checkbox
              ref={boxRef}
              checked={submitted}
              onCheckedChange={(v) => setSubmitted(v === true)}
              className="mt-0.5"
              aria-label={BEAMENTOR_CHECKBOX}
            />
            <span className="font-medium">{BEAMENTOR_CHECKBOX}</span>
          </label>
        </section>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="glow-emerald h-12 w-full rounded-xl bg-primary text-[15px] font-semibold hover:bg-emerald"
          disabled={!submitted || saving}
        >
          {saving ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : 'Continue to the app'}
        </Button>
      </form>
    </AuthLayout>
  );
}
