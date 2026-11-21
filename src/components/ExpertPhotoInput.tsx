// The expert's headshot on sign-up and Edit profile. Uploads straight away to
// the expert_photos bucket (services/auth.ts uploadExpertPhoto); the page saves
// the returned URL as details.photo_url with the rest of the form.
import { useRef, useState } from 'react';
import { Loader2, UploadCloud, UserRound } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { expertPhotoProblem, uploadExpertPhoto } from '../services/auth';

export default function ExpertPhotoInput({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const problem = expertPhotoProblem(file);
    if (problem) return setError(problem);
    setError(null);
    setUploading(true);
    onBusyChange?.(true);
    try {
      onChange(await uploadExpertPhoto(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that photo. Try again.");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-2 block text-[13px] font-semibold">Photo (optional)</p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary/60">
          {value
            ? <img src={value} alt="Your photo" className="h-full w-full object-cover" />
            : <UserRound className="h-8 w-8 text-muted-foreground" />}
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()} className="gap-1.5">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
            </Button>
            {value && !uploading && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>Remove</Button>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground">A headshot for the Summit experts page. JPG, PNG or WebP, up to 5 MB.</p>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Upload photo"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {error && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{error}</p>}
    </div>
  );
}
