// Profile > Delete account. Two steps so it can't happen by accident: a
// "Yes, delete my account" warning, then typing your own email to unlock the
// final button (a confirmation check rather than a bot CAPTCHA: only a
// signed-in person can reach this).
import { useState } from 'react';
import { Loader2 } from '@/components/icons';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function DeleteAccountDialog({ open, onOpenChange, email, onDelete }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  /** Deletes the account; throws with a message to show if it can't. */
  onDelete: () => Promise<void>;
}) {
  const [step, setStep] = useState<'warn' | 'confirm'>('warn');
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase() && email.trim() !== '';

  const close = (next: boolean) => {
    if (deleting) return;
    if (!next) {
      setStep('warn');
      setTyped('');
      setError(null);
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    if (!matches || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Delete your account?</DialogTitle>
          <DialogDescription>
            This deletes your Summit account for good, on the website and the app. It can't be undone.
          </DialogDescription>
        </DialogHeader>

        {step === 'warn' ? (
          <div className="space-y-4">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Your profile and QR pass are deleted.</li>
              <li>You're taken off every session on your day and any team you're on.</li>
              <li>To come back, you'd sign up again from the start.</li>
            </ul>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => setStep('confirm')}>Yes, delete my account</Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-email" className="text-sm">
                To confirm, type your email: <span className="font-semibold">{email}</span>
              </Label>
              <Input
                id="delete-confirm-email"
                type="email"
                autoComplete="off"
                autoFocus
                value={typed}
                disabled={deleting}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={deleting} onClick={() => close(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={!matches || deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete account forever'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
