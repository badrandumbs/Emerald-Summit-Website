// Shown when an expert picks "Serve as an expert" on a track (Nov 23, 2026):
// tells them their profile will be visible to students on this track's page
// and on the page that recognizes all experts, and asks whether to attach
// their LinkedIn. Their last answer is filled in, so a second track is one
// click. Saving the choice and registering is the caller's job.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ExpertLinkedInChoice from '../ExpertLinkedInChoice';
import {
  expertTrackNotice, LINKEDIN_URL_KEY, LINKEDIN_VISIBLE_KEY, linkedInProblem,
} from '../../models/expertLinkedIn';

export default function ExpertTrackDialog({
  open,
  trackTitle,
  saved,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  trackTitle: string;
  /** The expert's saved details, for their last LinkedIn answer. */
  saved: Record<string, unknown> | null | undefined;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAnswers({
      [LINKEDIN_VISIBLE_KEY]: String(saved?.[LINKEDIN_VISIBLE_KEY] ?? ''),
      [LINKEDIN_URL_KEY]: String(saved?.[LINKEDIN_URL_KEY] ?? ''),
    });
  }, [open, saved]);

  const confirm = () => {
    const problem = linkedInProblem(answers, { mustChoose: true });
    if (problem) return setError(problem);
    onConfirm(answers);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onCancel(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Serve as an expert</DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-foreground">
            {expertTrackNotice(trackTitle)}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <ExpertLinkedInChoice
            showHeading={false}
            answers={answers}
            onChange={(k, v) => {
              setError(null);
              setAnswers((a) => ({ ...a, [k]: v }));
            }}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-emerald text-white hover:bg-emerald-deep">
              {busy ? 'Adding…' : 'Serve in this track'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
