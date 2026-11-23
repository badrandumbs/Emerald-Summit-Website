// Sign-up details, matching the app's onboarding and auth gate:
// - a new account gives its name and its role's questions
//   (models/profileFields.ts);
// - a signed-in volunteer or admin with no number, or a student volunteer or
//   EAF ambassador with no grade, is asked for just that before going on;
// - after Change role, the new role's questions are asked again, prefilled,
//   with the new role's agreement under them (an expert also adds a headshot);
// - every account agrees to the Code of Conduct once: under the questions at
//   sign-up, or on its own for an account made before it existed.
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Info, Mail, User } from '@/components/icons';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { agreeToCodeOfConduct, linkedInDetails, needsProfileSetup, saveProfileDetails, signOut } from '../services/auth';
import CodeOfConductWindow from '../components/CodeOfConductWindow';
import { Checkbox } from '@/components/ui/checkbox';
import ExpertPhotoInput from '../components/ExpertPhotoInput';
import { needsBeamentor, tracksBeamentor } from '../models/beamentor';
import { roleChangedPath } from '../services/roleChange';

const SECTION_HEADING = 'font-display text-2xl font-bold tracking-tight';
// What sits under a heading is indented a little, except the agreement box.
const SECTION_BODY = 'space-y-5 pl-4';
// A hairline above each section heading, so the sections read as separate blocks.
const SECTION_RULE = 'border-t border-border pt-8';
// Larger body text under Your Info, including the shared ProfileFieldInput questions
// (descendant selectors, so Settings keeps its own sizes).
const INFO_TEXT = '[&_label]:text-[15px] [&_p]:text-[13px] [&_input]:text-base [&_select]:text-base [&_textarea]:text-base';
import {
  agreementFor, needsCodeOfConduct, tracksCodeOfConduct,
} from '../models/codeOfConduct';
import AuthLayout, { AUTH_ENTER, authStagger } from '../components/AuthLayout';
import ProfileFieldInput from '../components/ProfileFieldInput';
import { roleByName, roleLabelFor, USER_ROLES } from '../models/roles';
import { formFields, isRealSchoolName, missingGateField, SPECTATOR_AGES_NOTE, VOLUNTEER_GRADE_FIELD, type ProfileField } from '../models/profileFields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const FIELD_CLASS = 'h-12 rounded-xl bg-secondary/40 text-[15px]';

/** Router state from Change role: ask the new role's questions. */
export interface ProfileSetupState {
  roleChanged?: boolean;
}

export default function ProfileSetupPage() {
  const { session, profile, loadingProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Change role sends ?changed=<new role> (roleChangedPath). Held once seen,
  // so a later redirect to plain /profile does not drop it.
  const [changedTo] = useState(() => new URLSearchParams(location.search).get('changed'));
  const roleChanged = changedTo != null || (location.state as ProfileSetupState | null)?.roleChanged === true;

  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  // The Code of Conduct's photo permission: true grants, false does not.
  const [photoConsent, setPhotoConsent] = useState<boolean | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const roleName = profile?.role as string | undefined;
  const subtype = profile?.volunteer_subtype as string | null | undefined;
  const onboarding = needsProfileSetup(profile);
  const gate = missingGateField(profile as Parameters<typeof missingGateField>[0]);
  const conductDue = needsCodeOfConduct(profile);
  // Experts agree to the Speaker Policy; everyone else to the Code of Conduct.
  const agreement = agreementFor(profile?.role as string | undefined);
  const media = agreement.mediaChoice;

  // Change role goes here before the profile has reloaded with the new role.
  const waitingForRole = changedTo != null && profile != null && profile.role !== changedTo;

  useEffect(() => {
    if (prefilled || loadingProfile || waitingForRole) return;
    const details = (profile?.details ?? {}) as Record<string, unknown>;
    // Google and LinkedIn give a name with the sign-in; an emailed code does not.
    const meta = session?.user.user_metadata ?? {};
    setName(((profile?.name as string | undefined) || meta.full_name || meta.name || linkedInDetails(session?.user)?.name || '').trim());
    setAnswers(Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v == null ? '' : String(v)])));
    setPrefilled(true);
  }, [profile, loadingProfile, prefilled, session, waitingForRole]);

  if (!loadingProfile && session == null) return <Navigate to="/home" replace />;
  if (waitingForRole) {
    return (
      <div className="flex min-h-svh items-center justify-center" aria-busy="true">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald/30 border-t-emerald" />
      </div>
    );
  }
  // Nothing to ask: go on into the site.
  if (!loadingProfile && session != null && !onboarding && !gate && !roleChanged && !conductDue) {
    return <Navigate to="/home" replace />;
  }

  // The gate asks only for what's missing, like the app's phone and grade
  // screens (the school step is website-only for now).
  const gateOnly = !onboarding && !roleChanged && gate != null;
  // A finished account with nothing else missing: just the Code of Conduct.
  const conductOnly = !onboarding && !roleChanged && gate == null && conductDue;
  // Sign-up asks for it under the questions, once the SQL has added the columns;
  // so does Change role, when the new role's agreement is still due.
  const askConduct = conductOnly || (onboarding && tracksCodeOfConduct(profile)) || (roleChanged && conductDue);
  const fields: ProfileField[] = conductOnly ? [] : gateOnly
    ? gate === 'grade'
      ? [VOLUNTEER_GRADE_FIELD]
      : formFields(roleName, subtype).filter((f) => f.key === gate)
    : formFields(roleName, subtype);
  const email = (session?.user.email ?? profile?.email ?? '').trim();
  // Experts add a headshot once expert_beamentor.sql has made its bucket.
  const askPhoto = roleName === 'expert' && !gateOnly && !conductOnly && tracksBeamentor(profile);
  const role = roleByName(roleName) ?? USER_ROLES[0];
  const label = roleLabelFor(role.name, subtype);

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
    setError(null);
    if (conductOnly) {
      if (!agreed) return setError(`Please tick the box to agree to the ${agreement.name}.`);
      if (media && photoConsent == null) return setError('Please choose whether you grant photo permission.');
      setIsSaving(true);
      try {
        await agreeToCodeOfConduct(agreement.version, media ? photoConsent : null);
        await refreshProfile();
        navigate('/home', { replace: true });
      } catch {
        setError("Couldn't save that. Check your connection and try again.");
      } finally {
        setIsSaving(false);
      }
      return;
    }
    if (!gateOnly && !name.trim()) return setError('Please enter your name.');
    const missing = fields.find((f) => f.required && !(answers[f.key] ?? '').trim());
    if (missing) {
      return setError(missing.key === 'phone' ? 'Mobile number is required.' : `Please answer "${missing.label}".`);
    }
    // An optional school may stay blank, but anything typed must name a school.
    const badSchool = fields.find((f) => f.schoolPicker && (answers[f.key] ?? '').trim() && !isRealSchoolName(answers[f.key]));
    if (badSchool) return setError("Type your school's full name.");
    if (askConduct && !agreed) return setError(`Please tick the box to agree to the ${agreement.name}.`);
    if (askConduct && media && photoConsent == null) return setError('Please choose whether you grant photo permission.');
    setIsSaving(true);
    try {
      const out = Object.fromEntries(fields.map((f) => [f.key, answers[f.key] ?? '']));
      if (askPhoto) out.photo_url = answers.photo_url ?? '';
      await saveProfileDetails(gateOnly ? (profile?.name as string) ?? name : name, out, onboarding);
      if (askConduct) await agreeToCodeOfConduct(agreement.version, media ? photoConsent : null);
      await refreshProfile();
      navigate('/home', { replace: true });
    } catch {
      setError(gate === 'phone' && gateOnly ? 'Could not save your number. Please try again.' : 'Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const title = conductOnly
    // An expert still has BeAMentor after this.
    ? needsBeamentor(profile) ? 'One more step' : 'One last step'
    : gateOnly
    ? gate === 'phone' ? 'Add your number' : gate === 'school' ? 'Add your school' : 'Add your grade'
    : roleChanged ? `Your details as ${/^[aeiou]/i.test(label) ? 'an' : 'a'} ${label}` : 'Tell us a bit about yourself';
  const intro = conductOnly
    ? `${agreement.whoAgrees} Read it below, or expand it to read it in full.`
    : gateOnly
    ? gate === 'phone'
      ? `${role.label}s need a mobile number on file so the Summit team can reach you.`
      : gate === 'school'
      ? "Participants tell us their school. Pick it from the list, or choose Other and type its full name."
      : 'Student volunteers and EAF ambassadors give a grade. It goes on your volunteer hours record.'
    : 'Add your name and the details the Summit team needs.';

  const roleFields = fields.map((f) => (
    <ProfileFieldInput
      key={f.key}
      field={f}
      value={answers[f.key] ?? ''}
      onChange={(v) => setAnswers((a) => ({ ...a, [f.key]: v }))}
    />
  ));

  return (
    <AuthLayout
      fullScreen
      accent={role.color}
      icon={role.icon}
      eyebrow="Set up your profile"
      title={label}
      backLabel={isSigningOut ? 'Signing out…' : 'Sign out'}
      onBack={() => void handleSignOut()}
    >
      <div style={authStagger(1)} className={AUTH_ENTER}>
        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{intro}</p>
        {roleName === 'attendee' && !gateOnly && (
          <p className="mt-4 flex gap-2 rounded-xl bg-secondary/60 px-3.5 py-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
            {SPECTATOR_AGES_NOTE}
          </p>
        )}
      </div>

      <form
        className="animate-fade-up mt-12 space-y-6 motion-reduce:animate-none"
        style={{ animationDelay: '90ms' }}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
      >
        {!gateOnly && (
          <section className={cn(SECTION_RULE, 'space-y-5 pb-8')}>
            <h2 className={SECTION_HEADING}>Your Info</h2>
            <div className={cn(SECTION_BODY, INFO_TEXT)}>
            <div>
              <Label htmlFor="name" className="mb-2 block text-[13px] font-semibold">Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={cn(FIELD_CLASS, 'pl-10')} />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="mb-2 block text-[13px] font-semibold">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" readOnly value={email} aria-describedby="email-help" className={cn(FIELD_CLASS, 'pl-10 text-muted-foreground')} />
              </div>
              <p id="email-help" className="mt-1.5 text-[12px] text-muted-foreground">From your sign-in. Summit emails go here.</p>
            </div>
            {askPhoto && (
              <ExpertPhotoInput
                value={answers.photo_url ?? ''}
                onChange={(url) => setAnswers((a) => ({ ...a, photo_url: url }))}
                onBusyChange={setPhotoBusy}
                returnPath={changedTo ? roleChangedPath(changedTo) : '/profile'}
                autoImport
              />
            )}
            {roleFields}
            </div>
          </section>
        )}

        {gateOnly && roleFields}

        {askConduct && (
          <div className="space-y-16 pb-8">
            <section className={cn(SECTION_RULE, 'space-y-4')}>
              <h2 className={SECTION_HEADING}>{agreement.name}</h2>
              <CodeOfConductWindow agreement={agreement} />
              <label className="flex cursor-pointer items-start gap-3 text-base">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                  aria-label={agreement.checkbox}
                />
                <span className="font-medium">{agreement.checkbox}</span>
              </label>
            </section>
            {/* Asked after the agreement, once they have read the Code of Conduct. */}
            {media && (
              <div className={SECTION_RULE}>
              <fieldset>
                <legend className={cn(SECTION_HEADING, 'mb-5')}>{media.section}</legend>
                <div className={cn(SECTION_BODY, 'space-y-4')}>
                <p className="text-base font-semibold">{media.prompt}</p>
                {([[true, media.grant], [false, media.doNotGrant]] as const).map(([value, label]) => (
                  <label key={String(value)} className="flex cursor-pointer items-start gap-3 text-base leading-relaxed">
                    <input
                      type="radio"
                      name="photo-consent"
                      checked={photoConsent === value}
                      onChange={() => setPhotoConsent(value)}
                      className="mt-1 h-5 w-5 shrink-0 accent-emerald"
                    />
                    <span>{label}</span>
                  </label>
                ))}
                </div>
              </fieldset>
              </div>
            )}
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="glow-emerald h-12 w-full rounded-xl bg-primary text-[15px] font-semibold hover:bg-emerald"
          disabled={isSaving || photoBusy || (askConduct && (!agreed || (media != null && photoConsent == null)))}
        >
          {isSaving ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : conductOnly ? 'Agree and continue' : gateOnly ? 'Save and continue' : 'Continue'}
        </Button>
      </form>
    </AuthLayout>
  );
}
