// Home's Support EAF and About the app sections (website only for now). Support
// EAF is also on the Summit '27 page, where the sponsors are
// (src/pages/Summit27Page.tsx, data in src/models/sponsors.ts). EAF links come from EAF's real site,
// ehsacademics.org (Initiatives → Emerald Summit '27 → Sponsor; checked
// Nov 14, 2026). The old Google Sites page (sites.google.com/view/
// ehs-academic-foundation) is out of date: don't use it.
import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, HeartHandshake, Loader2, X, type AppIcon } from '@/components/icons';
import { useIsPhoneScreen } from '@/lib/device';
import SummitLogo from '../SummitLogo';
import { cn } from '@/lib/utils';

const EAF_SITE = 'https://www.ehsacademics.org';
/**
 * EAF's Zeffy donation form (the one the organizers sent on Nov 20, 2026).
 * Computers and tablets get it embedded in a popup (the embed's iframe, the
 * same URL Zeffy's embed code falls back to); phones open the full page.
 */
const ZEFFY_ORIGIN = 'https://www.zeffy.com';
const ZEFFY_FORM = '6938c617-88ca-483d-ab7d-997e94ed8b6c';
export const EAF_DONATE_URL = `https://www.zeffy.com/en-US/donation-form/${ZEFFY_FORM}`;
export const EAF_DONATE_EMBED_URL = `https://www.zeffy.com/embed/donation-form/${ZEFFY_FORM}`;
export const EAF_VOLUNTEER_URL = `${EAF_SITE}/get-involved/parent-volunteering`;
function SectionTitle({ id, children }: { id: string; children: string }) {
  return <h2 id={id} className="mb-3 font-display text-xl font-bold tracking-tight sm:text-2xl">{children}</h2>;
}

function buttonClass(primary?: boolean) {
  return cn(
    'inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold transition-colors',
    primary ? 'bg-emerald text-white hover:bg-emerald-deep' : 'border border-border bg-card hover:border-emerald/40',
  );
}

export function LinkButton({
  href,
  children,
  primary,
  icon: Icon = ArrowRight,
}: {
  href: string;
  children: string;
  primary?: boolean;
  icon?: AppIcon;
}) {
  const external = !href.startsWith('mailto:');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel="noreferrer"
      className={buttonClass(primary)}
    >
      {children}
      <Icon className={cn('h-3.5 w-3.5', external && Icon === ArrowRight && '-rotate-45')} aria-hidden />
    </a>
  );
}

/**
 * A Zeffy form button: on a phone, a link that opens Zeffy's page in a new tab
 * (an embedded payment form in a popup is cramped there); anywhere else, a
 * popup with the form embedded, so people give without leaving. Donate and
 * Become a sponsor each use their own form.
 */
export function ZeffyFormButton({
  label,
  dialogTitle,
  pageUrl,
  embedUrl,
  icon: Icon,
}: {
  label: string;
  dialogTitle: string;
  pageUrl: string;
  embedUrl: string;
  icon: AppIcon;
}) {
  const phone = useIsPhoneScreen();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const titleId = useId();
  const descId = useId();
  // A cold Zeffy form takes 3 to 5 seconds to draw, so it starts loading
  // (hidden) as soon as the button is near the screen, and stays loaded: by
  // the time someone clicks, the popup opens on a finished form. That's why
  // this is a native <dialog> and not the Radix one, which unmounts (and so
  // reloads the iframe) every time it closes.
  const [preload, setPreload] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [open, setOpen] = useState(false);
  const fallback = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (phone || preload) return;
    const el = buttonRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setPreload(true);
    }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [phone, preload]);

  // Zeffy's embed posts its height ({ id: 'zeffy-iframe', height }) once the
  // form is drawn, about half a second after the iframe's load event.
  useEffect(() => {
    if (!preload) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin === ZEFFY_ORIGIN && e.source === frameRef.current?.contentWindow) setDrawn(true);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(fallback.current);
    };
  }, [preload]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Out of the tab order and the accessibility tree while closed.
    dialog.inert = !open;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      closeRef.current?.focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open, preload]);

  // The page behind the popup stays put, as with the other dialogs.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = before;
    };
  }, [open]);

  if (phone) return <LinkButton href={pageUrl} primary icon={Icon}>{label}</LinkButton>;
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPreload(true);
          setOpen(true);
        }}
        className={buttonClass(true)}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
      {preload && (
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          aria-describedby={descId}
          // Escape (the browser's cancel) and the ×.
          onClose={() => setOpen(false)}
          // A click on the dimmed backdrop lands on the <dialog> itself.
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          // Closed, it stays laid out but invisible and inert (see below):
          // Zeffy only draws its form once its frame is displayed, so a
          // display: none popup would still make people wait on first open.
          className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-lg border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/80 [&:not([open])]:pointer-events-none [&:not([open])]:fixed [&:not([open])]:inset-0 [&:not([open])]:-z-10 [&:not([open])]:block [&:not([open])]:opacity-0"
        >
          <div className="flex max-h-[92vh] flex-col">
            <div className="relative border-b border-border px-5 py-4 pr-12 text-left">
              <h2 id={titleId} className="font-display text-lg font-semibold leading-none tracking-tight">{dialogTitle}</h2>
              <p id={descId} className="mt-1.5 text-[13px] text-muted-foreground">
                Secure form by Zeffy. EAF is a 501(c)(3) nonprofit, so your gift is tax-deductible.{' '}
                <a href={pageUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald underline-offset-2 hover:underline">
                  Open in a new tab
                </a>
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <div className="relative h-[min(72vh,760px)] w-full">
              {!drawn && (
                <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading the form…
                </p>
              )}
              <iframe
                ref={frameRef}
                title="Donation form powered by Zeffy"
                src={embedUrl}
                allow="payment"
                // In case Zeffy stops posting its height message, show the
                // form 2 s after load anyway (how long it used to take to draw).
                onLoad={() => {
                  window.clearTimeout(fallback.current);
                  fallback.current = window.setTimeout(() => setDrawn(true), 2000);
                }}
                className={cn('absolute inset-0 h-full w-full border-0 transition-opacity', drawn ? 'opacity-100' : 'opacity-0')}
              />
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}

export function DonateButton() {
  return (
    <ZeffyFormButton
      label="Donate"
      dialogTitle="Donate to EAF"
      pageUrl={EAF_DONATE_URL}
      embedUrl={EAF_DONATE_EMBED_URL}
      icon={HeartHandshake}
    />
  );
}

export function SupportEafCard() {
  return (
    <section aria-labelledby="support-eaf">
      <SectionTitle id="support-eaf">Support EAF</SectionTitle>
      <div className="rounded-3xl border border-emerald/20 bg-gradient-to-br from-emerald/10 to-emerald/[0.03] p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <SummitLogo size={64} className="shrink-0" />
          <div className="max-w-3xl space-y-3 text-[14.5px] leading-relaxed">
            <p>
              This Emerald Summit App is brought to you 100% built by students and free for all to use.
            </p>
            <p>
              Emerald Academic Foundation (EAF) supports student-initiated projects, like this app, along
              with several others that bring opportunities to students across areas, ultimately
              empowering leadership, student-initiative, and collaboration.
            </p>
            <p className="font-semibold">Please consider supporting EAF and its mission.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2.5 sm:pl-[80px]">
          <DonateButton />
          <LinkButton href={EAF_VOLUNTEER_URL}>Volunteer with EAF</LinkButton>
        </div>
      </div>
    </section>
  );
}

const LEAD_DEVELOPERS = ['Arjun Mahajan', 'Akhil Muthyala'];
const DEVELOPERS_AND_TESTERS = ['Nihtahli Anand', 'Arush Singh', 'Guhan Bala', 'Deep Shah'];

function joinNames(names: string[]) {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function AboutAppCard() {
  return (
    <section aria-labelledby="about-app">
      <SectionTitle id="about-app">About the app</SectionTitle>
      <div className="glass rounded-3xl p-5 sm:p-6">
        <p className="text-[14.5px] leading-relaxed">
          This app has been 100% built by Emerald High School students.
        </p>
        <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Lead developers</dt>
            <dd className="mt-1 font-semibold">{joinNames(LEAD_DEVELOPERS)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Developers and testers</dt>
            <dd className="mt-1 font-semibold">{joinNames(DEVELOPERS_AND_TESTERS)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
