import ThemeToggle from './ThemeToggle';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT_ARRAY } from '@/lib/motion';
import { ChevronDown, Menu, X } from '@/components/icons';
import BrandMark from './BrandMark';
import { cn } from '@/lib/utils';

/** Keynote, Experts and Team live on their own page (KeynoteTeamPage); the rest are sections of "/". */
const KEYNOTE_TEAM_PATH = '/keynote-and-team';
type SectionLink = { id: string; label: string; path?: string };
type NavGroup = { id: string; label: string; children: SectionLink[] };
type ActiveGroup = { id: string; via: 'hover' | 'press' } | null;

const NAV_ITEMS: (SectionLink | NavGroup)[] = [
  { id: 'about-menu', label: 'About', children: [
    { id: 'about', label: 'About the Summit' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact' },
  ] },
  { id: 'disciplines', label: 'Disciplines' },
  { id: 'summit-menu', label: 'Summit ’27', children: [
    { id: 'keynote', label: 'Keynote', path: KEYNOTE_TEAM_PATH },
    { id: 'experts', label: 'Experts', path: KEYNOTE_TEAM_PATH },
    { id: 'team', label: 'Team', path: KEYNOTE_TEAM_PATH },
  ] },
  { id: 'support-menu', label: 'Support', children: [
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'donate', label: 'Donate' },
  ] },
];

function DesktopNavGroup({ group, active, onOpen, onClose, onSelect }: {
  group: NavGroup;
  active: ActiveGroup;
  onOpen: (via: 'hover' | 'press') => void;
  onClose: () => void;
  onSelect: (id: string, path?: string) => void;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const expanded = active?.id === group.id;
  const panelId = 'lp-nav-' + group.id;
  return (
    <div
      ref={groupRef}
      className="lp-nav__group"
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') onOpen('hover'); }}
      onPointerLeave={() => {
        if (!groupRef.current?.contains(document.activeElement)) onClose();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onClose();
      }}
    >
      <button
        id={panelId + '-trigger'}
        type="button"
        className="lp-nav__link lp-nav__group-trigger"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => {
          if (expanded && active?.via === 'press') onClose();
          else onOpen('press');
        }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return;
          event.preventDefault();
          onOpen('press');
          requestAnimationFrame(() => groupRef.current?.querySelector<HTMLElement>('.lp-nav__dropdown .lp-nav__link')?.focus());
        }}
      >
        {group.label}<ChevronDown aria-hidden="true" />
      </button>
      <div id={panelId} className="lp-nav__dropdown" hidden={!expanded}>
        <div className="lp-nav__dropdown-list">
          {group.children.map((link) => (
            <button key={link.id} type="button" className="lp-nav__link" onClick={() => onSelect(link.id, link.path)}>
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface LandingNavProps {
  /**
   * Float above the page instead of taking layout space, so the hero's night
   * sky runs behind the bar rather than the light page background showing
   * through it.
   */
  overlay?: boolean;
  /**
   * Drives the slide-down entrance. Leave undefined for no entrance at all
   * (the bar is simply there); pass `false` to park it above the viewport and
   * `true` to drop it in. Timed off the caller's reveal, not off mount.
   */
  entered?: boolean;
  /** Seconds to hold after `entered` flips before the bar drops. */
  entranceDelay?: number;
}

/**
 * Public navigation with four top-level choices. Grouped destinations use
 * desktop disclosures and labeled sections in the phone menu. Section links
 * from other pages route home with the existing scroll target in nav state.
 */
export default function LandingNav({
  overlay = false,
  entered,
  entranceDelay = 0,
}: LandingNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ActiveGroup>(null);
  const reduceMotion = useReducedMotion();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  // The phone menu: Escape closes it and hands focus back to its button;
  // opening it moves focus to its first link.
  useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>('.lp-nav__link')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open && !activeGroup) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setActiveGroup(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (open) {
        setOpen(false);
        menuBtnRef.current?.focus();
      } else if (activeGroup) {
        if (navRef.current?.contains(document.activeElement)) {
          document.getElementById('lp-nav-' + activeGroup.id + '-trigger')?.focus();
        }
        setActiveGroup(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, activeGroup]);

  useEffect(() => {
    setOpen(false);
    setActiveGroup(null);
  }, [location.key]);

  // A sheet left open on a phone must not reappear alongside desktop links.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 60rem)');
    const onChange = () => {
      if (sheetRef.current?.contains(document.activeElement) && !media.matches) {
        navRef.current?.querySelector<HTMLElement>('.lp-nav__link')?.focus();
      } else if (navRef.current?.contains(document.activeElement) && media.matches) {
        menuBtnRef.current?.focus();
      }
      setOpen(false);
      setActiveGroup(null);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  // Clear over the sky while parked at the top; solid once the page moves.
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openGroup = (id: string, via: 'hover' | 'press') => {
    setActiveGroup((current) => {
      if (via === 'hover' && current) {
        if (current.id === id) return current;
        const trigger = document.getElementById('lp-nav-' + current.id + '-trigger');
        // Moving the pointer must not hide a submenu being used by keyboard.
        if (trigger?.parentElement?.contains(document.activeElement)) return current;
      }
      return { id, via };
    });
  };

  const goToSection = (id: string, path = '/') => {
    // Same-page jumps keep the header mounted; return focus before hiding
    // the selected button so it never remains inside a collapsed menu.
    if (open && sheetRef.current?.contains(document.activeElement)) {
      menuBtnRef.current?.focus({ preventScroll: true });
    } else if (activeGroup) {
      const trigger = document.getElementById('lp-nav-' + activeGroup.id + '-trigger');
      if (trigger?.parentElement?.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    }
    setOpen(false);
    setActiveGroup(null);
    if (location.pathname === path) {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(path, { state: { scrollTo: id } });
    }
  };

  return (
    <motion.header
      className={cn(
        'lp lp-night lp-nav',
        overlay && 'lp-nav--overlay',
        (scrolled || open || activeGroup) && 'is-scrolled',
      )}
      initial={entered === undefined ? false : { transform: 'translateY(-105%)' }}
      animate={{ transform: entered === false ? 'translateY(-105%)' : 'translateY(0%)' }}
      transition={{
        duration: 0.5,
        delay: entered ? entranceDelay : 0,
        ease: EASE_OUT_ARRAY,
      }}
    >
      <div className="lp-nav__track">
        <div className="lp-nav__bar">
          <div className="container lp-nav__inner">
            <BrandMark
              logoClassName="h-9 w-9 lg:h-10 lg:w-10"
              titleClassName="text-base font-semibold tracking-tight text-white lg:text-[17px]"
              showSubtitle={false}
              gap="gap-2.5"
            />

            <nav ref={navRef} className="lp-nav__links" aria-label="Main">
              {NAV_ITEMS.map((s) => 'children' in s ? (
                <DesktopNavGroup
                  key={s.id}
                  group={s}
                  active={activeGroup}
                  onOpen={(via) => openGroup(s.id, via)}
                  onClose={() => setActiveGroup((current) => current?.id === s.id ? null : current)}
                  onSelect={goToSection}
                />
              ) : (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSection(s.id, s.path)}
                  className="lp-nav__link"
                >
                  {s.label}
                </button>
              ))}
            </nav>

            <div className="lp-nav__actions">
              <ThemeToggle tone="onDark" />
              <button
                type="button"
                className="lp-btn lp-btn--quiet"
                onClick={() => navigate('/home')}
              >
                Sign in
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              ref={menuBtnRef}
              className="lp-nav__menu-btn"
              aria-label="Toggle menu"
              aria-expanded={open}
              aria-controls="lp-nav-sheet"
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        <AnimatePresence>
        {open && (
          <motion.div
            id="lp-nav-sheet"
            ref={sheetRef}
            className="lp-nav__sheet"
            initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(-8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, transform: 'translateY(-8px)', transition: { duration: 0.15 } }}
            transition={{ duration: 0.22, ease: EASE_OUT_ARRAY }}
          >
            <div className="container lp-nav__sheet-list">
              <div className="lp-nav__sheet-actions">
                <ThemeToggle tone="onDark" labels />
                <button type="button" className="lp-btn" onClick={() => { setOpen(false); navigate('/home'); }}>Sign in</button>
              </div>
              <nav aria-label="Main mobile" className="lp-nav__sheet-sections">
              {NAV_ITEMS.map((s) => 'children' in s ? (
                <section key={s.id} aria-labelledby={'lp-nav-mobile-' + s.id} className="lp-nav__sheet-group">
                  <h2 id={'lp-nav-mobile-' + s.id} className="lp-nav__sheet-heading">{s.label}</h2>
                  {s.children.map((link) => (
                    <button key={link.id} type="button" className="lp-nav__link" onClick={() => goToSection(link.id, link.path)}>
                      {link.label}
                    </button>
                  ))}
                </section>
              ) : (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToSection(s.id, s.path)}
                  className="lp-nav__link"
                >
                  {s.label}
                </button>
              ))}
              </nav>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
