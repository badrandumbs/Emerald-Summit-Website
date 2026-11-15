// An agreement (the Code of Conduct, or the Speaker Policy for experts) in a
// bordered, scrollable window, with Expand to read it in a large popup. Used by the last sign-up step (ProfileSetupPage), like the
// app's CodeOfConductWindow.
import { useState } from 'react';
import { Maximize2 } from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SummitAgreement } from '../models/codeOfConduct';

export function CodeOfConductText({ agreement, showTitle = true }: { agreement: SummitAgreement; showTitle?: boolean }) {
  return (
    <div className="space-y-4 text-[14px] leading-relaxed">
      {showTitle && <h3 className="font-display text-lg font-bold">{agreement.title}</h3>}
      <p>{agreement.intro}</p>
      {agreement.sections.map((section) => (
        <section key={section.title} className="space-y-1.5">
          <h4 className="font-semibold text-emerald">{section.title}</h4>
          {section.points.map((p) => (
            <p key={p.lead}>
              <span className="font-semibold">{p.lead}.</span> {p.text}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

export default function CodeOfConductWindow({ agreement }: { agreement: SummitAgreement }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-secondary/40">
      <div
        className="max-h-64 overflow-y-auto px-4 py-3.5"
        tabIndex={0}
        role="region"
        aria-label={agreement.title}
      >
        <CodeOfConductText agreement={agreement} />
      </div>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-center gap-2 border-t border-border py-2.5 text-sm font-semibold text-emerald transition-colors hover:bg-secondary"
      >
        <Maximize2 className="h-4 w-4" aria-hidden /> Expand
      </button>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{agreement.title}</DialogTitle>
          </DialogHeader>
          <CodeOfConductText agreement={agreement} showTitle={false} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
