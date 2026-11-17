// The EAF seal in the landing page's bottom-right corner. Hovering it (or
// focusing or clicking it) opens a small card with the portal's Support EAF
// pitch and the same Donate and Volunteer buttons. Not shown on phones: there's
// no hover there, a fixed corner button would cover the page, and phones
// already get the "Better in the app" banner. The portal keeps its full
// Support EAF section.
import { useEffect, useRef, useState } from 'react';
import EafLogo from '../components/EafLogo';
import { DonateButton, EAF_VOLUNTEER_URL, LinkButton } from '../components/home/AboutSections';
import { useIsPhoneScreen } from '../lib/device';

export default function EafDonateCorner() {
  const phone = useIsPhoneScreen();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  // A short delay before closing, so moving the pointer from the seal up to the card doesn't shut it.
  const show = () => { window.clearTimeout(closeTimer.current); setOpen(true); };
  const hideSoon = () => { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(false), 200); };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: PointerEvent) => {
      // Clicks inside the Zeffy popup (a portal outside this element) mustn't count as outside.
      const t = e.target as Element | null;
      if (!rootRef.current?.contains(t) && !t?.closest('[role="dialog"]')) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  if (phone) return null;

  return (
    <div
      ref={rootRef}
      className="lp-eaf"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onFocus={show}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) hideSoon(); }}
    >
      {open && (
        <div id="lp-eaf-card" role="region" aria-label="Support EAF" className="lp-eaf__card">
          <p className="lp-eaf__title">Support EAF</p>
          <p className="lp-eaf__text">
            The Summit and this app are 100% student-built and free for everyone. The EHS Academic
            Foundation backs student-led projects like these, building leadership, initiative and
            collaboration.
          </p>
          <p className="lp-eaf__text lp-eaf__ask">Please consider supporting EAF and its mission.</p>
          <p className="lp-eaf__fine">EAF is a 501(c)(3) nonprofit, so your gift is tax-deductible.</p>
          <div className="lp-eaf__actions">
            <DonateButton />
            <LinkButton href={EAF_VOLUNTEER_URL}>Volunteer with EAF</LinkButton>
          </div>
        </div>
      )}
      <button
        type="button"
        className="lp-eaf__seal"
        aria-label="Support the EHS Academic Foundation"
        aria-expanded={open}
        aria-controls="lp-eaf-card"
        onClick={() => setOpen((o) => !o)}
      >
        <EafLogo />
      </button>
    </div>
  );
}
