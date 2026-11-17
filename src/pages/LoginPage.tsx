import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, Mail, ShieldCheck } from '@/components/icons';
import { toast } from 'sonner';
import { SIGN_IN_ROLES } from '../models/roles';
import { useAuth } from '../context/AuthContext';
import {
  NoAccountError,
  isTestAccount,
  sendSignInCode,
  signOut,
  signedInAccountNeedsSignUp,
  signInWithTestAccount,
  verifySignInCode,
} from '../services/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { isValidEmail } from '../lib/email';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ChangeRolePanel from '../components/ChangeRolePanel';
import AuthLayout, { AUTH_ENTER, authStagger } from '../components/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Router state that can prefill the email box. */
export interface LoginLocationState {
  email?: string;
}

export default function LoginPage() {
  const { role: roleName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = SIGN_IN_ROLES.find((r) => r.name === roleName);
  const { session, profile, clearSignInError } = useAuth();
  const signedInRole = session ? ((profile?.role as string | undefined) ?? null) : null;

  const incoming = (location.state as LoginLocationState | null) ?? {};
  const [email, setEmail] = useState(incoming.email ?? '');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  // Test accounts (when isDevLoginEnabled is on) type the shared password instead of a code.
  const [testAccount, setTestAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  // Sign in was tried with an email that has no account.
  const [noAccount, setNoAccount] = useState(false);
  // Sign in reached an account that never finished sign-up (Google makes one on
  // first use): it was signed out again, and this is its email.
  const [notSignedUp, setNotSignedUp] = useState<string | null>(null);
  // While that check runs, don't jump to Home just because a session appeared.
  const [checkingSignIn, setCheckingSignIn] = useState(false);

  if (!role) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="text-center">
          <p className="text-muted-foreground">Unknown role.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/home')}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }


  // Already signed in as this role: nothing to sign in to.
  if (signedInRole === role.name && !checkingSignIn) {
    return <Navigate to="/home" replace />;
  }

  // Sign up creates the account and then asks the sign-up questions (profile
  // details; the code of conduct is still to come) before the app opens. Sign
  // in only reaches an existing account and goes straight in. Either way the
  // profile gate (useRequireProfile) sends an account that hasn't finished
  // sign-up to /profile and a finished one to Home, so an existing account
  // that taps Sign up just signs in. Admins and test accounts use "Organizer
  // sign in" (role admin), which may create an allowlisted admin's account.
  const isOrganizer = role.name === 'admin';
  const signingUp = !isOrganizer && searchParams.get('mode') === 'signup';

  const switchMode = (toSignUp: boolean) => {
    setNoAccount(false);
    setNotSignedUp(null);
    setCodeSent(false);
    setCode('');
    setSearchParams(toSignUp ? { mode: 'signup' } : {}, { replace: true });
  };

  // Sign up (and organizer sign in) may land on a new account; sign in may not.
  // shortcut: Google's redirect fallback (no popup script) lands on /home and skips this check; route it back here if that path gets real use.
  const finishSignIn = async () => {
    if (signingUp || isOrganizer) {
      navigate('/home', { replace: true });
      return;
    }
    setCheckingSignIn(true);
    try {
      const { needsSignUp, email: accountEmail } = await signedInAccountNeedsSignUp();
      if (!needsSignUp) {
        navigate('/home', { replace: true });
        return;
      }
      await signOut();
      setCodeSent(false);
      setCode('');
      setNotSignedUp(accountEmail || email.trim());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setCheckingSignIn(false);
    }
  };

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed) || isChecking) return;
    setIsChecking(true);
    setNoAccount(false);
    setNotSignedUp(null);
    clearSignInError();
    try {
      if (testAccount) {
        await signInWithTestAccount(trimmed, password);
        setPassword('');
        navigate('/home', { replace: true });
      } else if (codeSent) {
        await verifySignInCode(trimmed, code.trim());
        await finishSignIn();
      } else if (await isTestAccount(trimmed)) {
        setTestAccount(true);
      } else {
        await sendSignInCode(trimmed, role.name, { createAccount: signingUp || isOrganizer });
        setCodeSent(true);
        toast.success('Check your email for a sign-in code.');
      }
    } catch (error) {
      if (error instanceof NoAccountError) {
        setNoAccount(true);
        return;
      }
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsChecking(false);
    }
  };

  // "Let's create you an account!": Continue switches to sign up and sends the
  // code straight away, so the next thing to do is enter it.
  const continueToSignUp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (isChecking) return;
    setIsChecking(true);
    try {
      await sendSignInCode(trimmed, role.name, { createAccount: true });
      switchMode(true);
      setCodeSent(true);
      toast.success('Check your email for a code to create your account.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsChecking(false);
    }
  };

  const leaveTestAccount = () => {
    setTestAccount(false);
    setPassword('');
  };

  const needsList = role.name === 'volunteer' || role.name === 'admin';
  const heading = isOrganizer
    ? 'Organizer sign in'
    : signingUp ? `Sign up as ${role.label}` : `Sign in as ${role.label}`;

  return (
    <AuthLayout
      accent={role.color}
      icon={role.icon}
      eyebrow={signingUp ? 'Sign up' : 'Sign in'}
      title={isOrganizer ? 'Organizer' : role.label}
      onBack={() => navigate('/roles')}
    >
      <div className="space-y-7">
        <header style={authStagger(1)} className={AUTH_ENTER}>
          <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-[44px]">
            {heading}
          </h1>
          {signingUp && (
            <p className="mt-3 text-[15px] text-muted-foreground">
              Continue with Google or your email, then tell us a bit about yourself.
            </p>
          )}
          {isOrganizer && (
            <p className="mt-3 text-[15px] text-muted-foreground">
              For Summit admins and test accounts.
            </p>
          )}
        </header>

        {signedInRole && (
          <div style={authStagger(2)} className={AUTH_ENTER}>
            <ChangeRolePanel role={role} />
          </div>
        )}

        <div style={authStagger(3)} className={cn(AUTH_ENTER, 'space-y-3')}>
          {/* New accounts get this role (the allowlist decides volunteer/admin). */}
          <GoogleSignInButton
            roleName={role.name}
            disabled={isChecking}
            onStart={() => { clearSignInError(); setNotSignedUp(null); }}
            onSignedIn={() => void finishSignIn()}
          />
          <div className="py-1 text-center text-xs text-muted-foreground">or use your email</div>
          <form onSubmit={handleEmail} className="space-y-3">
            <label htmlFor="login-email" className="block text-[13px] font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} disabled={codeSent || testAccount || isChecking} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-card pl-10 text-[15px]" />
            </div>
            {testAccount && <>
              <label htmlFor="login-password" className="block text-[13px] font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="login-password" type="password" autoComplete="current-password" autoFocus value={password} disabled={isChecking} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-card pl-10 text-[15px]" />
              </div>
              <p role="status" className="text-xs text-muted-foreground">{email} is a test account. Enter the test account password.</p>
            </>}
            {codeSent && <>
              <label htmlFor="login-code" className="block text-[13px] font-medium">Sign-in code</label>
              <Input id="login-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" minLength={6} maxLength={10} value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} className="h-12 rounded-xl bg-card text-[15px]" />
              <p role="status" className="text-xs text-muted-foreground">Enter the code sent to {email}.</p>
            </>}
            <Button type="submit" className="h-12 w-full rounded-xl bg-navy text-[15px] font-semibold text-white hover:bg-navy-bright dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90" disabled={!isSupabaseConfigured || !isValidEmail(email) || isChecking || (codeSent && code.length < 6) || (testAccount && password === '')}>
              {isChecking ? <Loader2 className="h-5 w-5 animate-spin" /> : testAccount ? 'Sign in' : codeSent ? 'Verify and sign in' : 'Send sign-in code'}
            </Button>
            {testAccount && <button type="button" onClick={leaveTestAccount} disabled={isChecking} className="text-xs font-medium text-muted-foreground underline">Use a different email</button>}
            {codeSent && <button type="button" onClick={() => { setCodeSent(false); setCode(''); }} className="text-xs font-medium text-muted-foreground underline">Use another email or resend code</button>}
          </form>
          {notSignedUp != null && (
            <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[13.5px]">
              <p className="font-display text-lg font-bold">Couldn't sign you in</p>
              <p className="mt-1 text-muted-foreground">
                There's no Summit account for{' '}
                {notSignedUp ? <span className="font-semibold text-foreground">{notSignedUp}</span> : 'that account'} yet.
                Sign up to create your {role.label} account.
              </p>
              <Button type="button" onClick={() => switchMode(true)} className="mt-3 w-full rounded-xl">
                Go to sign up
              </Button>
            </div>
          )}
          {noAccount && (
            <div role="alert" className="rounded-xl border border-border bg-card p-4 text-[13.5px]">
              <p className="font-display text-lg font-bold">No account found</p>
              <p className="mt-1 text-muted-foreground">
                There's no account for <span className="font-semibold text-foreground">{email.trim()}</span> yet.
                Press Continue to enter some information and create your {role.label} account.
              </p>
              <Button type="button" onClick={() => void continueToSignUp()} disabled={isChecking} className="mt-3 w-full rounded-xl">
                {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
            </div>
          )}
          {!isOrganizer && (
            <p className="pt-1 text-center text-[13px] text-muted-foreground">
              {signingUp ? 'Already have an account? ' : 'New to the Summit? '}
              <button type="button" onClick={() => switchMode(!signingUp)} className="font-semibold text-foreground underline underline-offset-4">
                {signingUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          )}
          {needsList && <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: role.color }} />{role.label}s need their sign-in email on the Summit team's {role.label.toLowerCase()} list.</p>}
          {role.name === 'expert' && <p className="text-[12.5px] leading-relaxed text-muted-foreground">Experts need approval from the Summit team before taking part.</p>}
        </div>

      </div>
    </AuthLayout>
  );
}
