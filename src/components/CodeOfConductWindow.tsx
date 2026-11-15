// An agreement (the Code of Conduct, or the Guest Expert Policy for experts)
// in a bordered, scrollable window, with Expand to read it in a large popup.
// Used by the last sign-up step (ProfileSetupPage), like the app's
// CodeOfConductWindow. The text is laid out as the document is.
import { useState } from 'react';
import { Maximize2 } from '@/components/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AgreementBlock, SummitAgreement } from '../models/codeOfConduct';

function Block({ block }: { block: AgreementBlock }) {
  const lead = block.lead && (
    <span className={block.italicLead ? 'italic' : 'font-semibold'}>
      {block.text ? `${block.lead}: ` : `${block.lead}:`}
    </span>
  );
  if (block.bullet) {
    return (
      <p className="flex gap-2 pl-1">
        <span aria-hidden>•</span>
        <span>
          {lead}
          {block.text}
        </span>
      </p>
    );
  }
  return (
    <p>
      {lead}
      {block.text}
    </p>
  );
}

export function CodeOfConductText({ agreement, showTitle = true }: { agreement: SummitAgreement; showTitle?: boolean }) {
  const media = agreement.mediaChoice;
  return (
    <div className="space-y-4 text-[14px] leading-relaxed">
      {(showTitle || agreement.preamble.length > 0) && (
        <div className="space-y-1">
          {showTitle && <h3 className="font-display text-lg font-bold">{agreement.title}</h3>}
          {agreement.preamble.map((line) => <p key={line} className="text-muted-foreground">{line}</p>)}
        </div>
      )}
      {agreement.sections.map((section) => (
        <section key={section.title} className="space-y-1.5">
          <h4 className="font-semibold text-emerald">{section.title}</h4>
          {section.blocks.map((b, i) => <Block key={i} block={b} />)}
          {media && media.section === section.title && (
            <div className="space-y-1.5">
              <p className="font-semibold">{media.prompt}</p>
              <p>___ {media.grant}</p>
              <p>___ {media.doNotGrant}</p>
            </div>
          )}
        </section>
      ))}
      {agreement.footer && <p className="text-[12px] text-muted-foreground">{agreement.footer}</p>}
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
