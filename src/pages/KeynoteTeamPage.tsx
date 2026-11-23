// The public Keynote, Experts & Team page (/keynote-and-team), reached from the
// landing nav's Keynote, Experts and Team links, which scroll to their own
// section here. Team shares its profiles with the portal, while Experts fills
// in by itself (ExpertsDirectory). /experts lands on Experts.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LandingNav from '../components/LandingNav';
import LandingFooter from '../components/LandingFooter';
import ExpertsDirectory, { EXPERTS_INTRO } from '../components/ExpertsDirectory';
import TeamDirectory from '../components/TeamDirectory';
import '../landing/landing.css';

const SECTIONS = [
  { id: 'keynote', title: 'Keynote', text: 'This year’s keynote speaker will be announced soon.' },
  { id: 'experts', title: 'Experts', text: '' },
  { id: 'team', title: 'Team', text: '' },
];

export default function KeynoteTeamPage() {
  const location = useLocation();

  // The nav sends { scrollTo: 'team' } (or keynote) when it brings you here.
  useEffect(() => {
    // Jump, not glide: the page opens at the landing page's scroll position, and a
    // long smooth scroll outruns painting, flashing empty bands on the way.
    const id = (location.state as { scrollTo?: string } | null)?.scrollTo;
    const frame = requestAnimationFrame(() => {
      const el = id ? document.getElementById(id) : null;
      if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.state]);

  return (
    <div className="lp lp-page">
      <LandingNav />
      <main id="main" className="lp-lineup">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="lp-section" aria-labelledby={`${s.id}-title`}>
            <div className="container">
              <div className="lp-head">
                <h2 id={`${s.id}-title`}>{s.title}</h2>
                {s.id === 'experts' && <p className="lead">{EXPERTS_INTRO}</p>}
              </div>
              {s.id === 'experts' ? (
                <ExpertsDirectory />
              ) : s.id === 'team' ? (
                <TeamDirectory />
              ) : (
                <div className="lp-soon">
                  <p className="lp-soon__tag">Coming soon</p>
                  <p>{s.text}</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </main>
      <LandingFooter />
    </div>
  );
}
