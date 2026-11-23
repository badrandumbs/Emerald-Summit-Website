// The expert's headshot on sign-up and Edit profile. Uploads straight away to
// the expert_photos bucket (services/auth.ts uploadExpertPhoto); the page saves
// the returned URL as details.photo_url with the rest of the form.
//
// LinkedIn: an expert with LinkedIn connected can use their LinkedIn photo
// (copied into expert_photos, since LinkedIn's links expire). On sign-up it is
// brought in on its own (`autoImport`). Anyone else gets Connect LinkedIn,
// which leaves for LinkedIn and comes back to `returnPath`.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UploadCloud, UserRound } from '@/components/icons';
import { Button } from '@/components/ui/button';
import LinkedInIcon from './LinkedInIcon';
import { useAuth } from '../context/AuthContext';
import {
  connectLinkedIn, expertPhotoProblem, importLinkedInPhoto, linkedInDetails, uploadExpertPhoto,
} from '../services/auth';

export default function ExpertPhotoInput({
  value,
  onChange,
  onBusyChange,
  returnPath,
  autoImport = false,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
  /** Where Connect LinkedIn comes back to. */
  returnPath: string;
  /** Bring in the LinkedIn photo by itself when there is no photo yet. */
  autoImport?: boolean;
}) {
  const { session, signInError, clearSignInError } = useAuth();
  const linkedIn = linkedInDetails(session?.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | 'upload' | 'linkedin'>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedAuto = useRef(false);

  const run = async (kind: 'upload' | 'linkedin', task: () => Promise<string>) => {
    setError(null);
    setBusy(kind);
    onBusyChange?.(true);
    try {
      onChange(await task());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that photo. Try again.");
    } finally {
      setBusy(null);
      onBusyChange?.(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = expertPhotoProblem(file);
    if (problem) return setError(problem);
    void run('upload', () => uploadExpertPhoto(file));
  };

  const useLinkedIn = () => {
    if (linkedIn?.photoUrl) void run('linkedin', () => importLinkedInPhoto(linkedIn.photoUrl!));
  };

  // Sign-up: the photo comes from LinkedIn unless they already have one.
  useEffect(() => {
    if (!autoImport || triedAuto.current || value || !linkedIn?.photoUrl) return;
    triedAuto.current = true;
    useLinkedIn();
  }, [autoImport, value, linkedIn?.photoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect LinkedIn came back with an error (for example, that LinkedIn is
  // already on another Summit account).
  useEffect(() => {
    if (!signInError) return;
    toast.error(signInError);
    clearSignInError();
  }, [signInError, clearSignInError]);

  const connect = async () => {
    setError(null);
    setConnecting(true);
    try {
      await connectLinkedIn(returnPath);
      // Leaving for LinkedIn.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect LinkedIn. Try again.");
      setConnecting(false);
    }
  };

  return (
    <div>
      <p className="mb-2 block text-[13px] font-semibold">Photo (optional)</p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/60">
          {busy
            ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            : value
            ? <img src={value} alt="Your photo" className="h-full w-full object-cover" />
            : <UserRound className="h-8 w-8 text-muted-foreground" />}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy != null} onClick={() => fileRef.current?.click()} className="gap-1.5">
              {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {busy === 'upload' ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
            </Button>
            {linkedIn?.photoUrl ? (
              <Button type="button" variant="outline" size="sm" disabled={busy != null} onClick={useLinkedIn} className="gap-1.5">
                {busy === 'linkedin' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkedInIcon size={14} />}
                {busy === 'linkedin' ? 'Getting photo…' : 'Use LinkedIn photo'}
              </Button>
            ) : !linkedIn && (
              <Button type="button" variant="outline" size="sm" disabled={busy != null || connecting} onClick={() => void connect()} className="gap-1.5">
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkedInIcon size={14} />}
                Connect LinkedIn
              </Button>
            )}
            {value && busy == null && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>Remove</Button>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">
            A headshot for the Summit experts page. Any photo works; large ones are made smaller.
            {!linkedIn && ' Or connect LinkedIn to use your LinkedIn photo.'}
            {linkedIn && !linkedIn.photoUrl && ' Your LinkedIn has no photo to use.'}
          </p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        aria-label="Upload photo"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
