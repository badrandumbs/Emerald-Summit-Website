// The experts signed up for a track (Nov 23, 2026): a card for each with their
// photo, name, title, company and area of expertise, and See more opening the
// whole profile, with their LinkedIn when they chose to show it to students.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { rgba } from '../../models/verseVibes';
import type { SessionExpert } from '../../services/sessionRegistration';
import LinkedInIcon from '../LinkedInIcon';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function ExpertPhoto({ expert, accent, className }: { expert: SessionExpert; accent: string; className: string }) {
  const [broken, setBroken] = useState(false);
  if (expert.photoUrl && !broken) {
    return <img src={expert.photoUrl} alt="" loading="lazy" onError={() => setBroken(true)} className={`${className} bg-muted object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${className} grid place-items-center font-display font-bold`}
      style={{ background: rgba(accent, 0.16), color: accent }}
    >
      {initials(expert.name)}
    </span>
  );
}

/** "Senior Robotics Engineer at Acme", or whichever half is there. */
export function expertRole(e: SessionExpert): string | null {
  if (e.title && e.company) return `${e.title} at ${e.company}`;
  return e.title ?? e.company;
}

export default function SessionExperts({ experts, accent }: { experts: SessionExpert[]; accent: string }) {
  const [open, setOpen] = useState<SessionExpert | null>(null);
  if (experts.length === 0) return null;
  const role = open ? expertRole(open) : null;

  return (
    <section aria-labelledby="track-experts">
      <h2 id="track-experts" className="mb-3 font-semibold">{experts.length === 1 ? 'Expert' : 'Experts'}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {experts.map((e) => (
          <li key={e.id} className="flex gap-3.5 rounded-2xl border border-border bg-card p-3.5">
            <ExpertPhoto expert={e} accent={accent} className="h-16 w-16 shrink-0 rounded-xl text-lg" />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate font-semibold leading-snug">{e.name}</p>
              {e.title && <p className="line-clamp-2 text-[13px] leading-snug">{e.title}</p>}
              {e.company && <p className="truncate text-[13px] text-muted-foreground">{e.company}</p>}
              {e.expertise && (
                <p className="mt-1.5 self-start rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: rgba(accent, 0.14), color: accent }}>
                  {e.expertise}
                </p>
              )}
              <button
                type="button"
                onClick={() => setOpen(e)}
                aria-label={`See more about ${e.name}`}
                className="mt-2 self-start text-[13px] font-semibold underline-offset-4 hover:underline"
                style={{ color: accent }}
              >
                See more
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={open != null} onOpenChange={(v) => { if (!v) setOpen(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md sm:rounded-2xl">
          {open && (
            <>
              <DialogHeader className="items-center text-center sm:text-center">
                <ExpertPhoto expert={open} accent={accent} className="h-28 w-28 rounded-2xl text-3xl" />
                <DialogTitle className="mt-3 font-display text-2xl">{open.name}</DialogTitle>
                <DialogDescription className="text-[15px]">{role ?? 'Expert'}</DialogDescription>
                {open.expertise && (
                  <p className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: rgba(accent, 0.14), color: accent }}>
                    {open.expertise}
                  </p>
                )}
              </DialogHeader>
              {open.bio && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">About</h3>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{open.bio}</p>
                </div>
              )}
              {open.linkedInUrl && (
                <Button asChild variant="outline" className="w-full">
                  <a href={open.linkedInUrl} target="_blank" rel="noopener noreferrer">
                    <LinkedInIcon size={18} /> Connect on LinkedIn
                  </a>
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
