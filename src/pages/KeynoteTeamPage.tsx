// The public Keynote & Team page (/keynote-and-team), reached from the landing
// nav's Keynote and Team links, which scroll to their own section here. Both
// say "Coming soon" until the speaker's and the team's details come in.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LandingNav from '../components/LandingNav';
import LandingFooter from '../components/LandingFooter';
import '../landing/landing.css';

const SECTIONS = [
  { id: 'keynote', title: 'Keynote', text: 'This year’s keynote speaker will be announced soon.' },
  { id: 'team', title: 'Team', text: 'Meet the students and organizers behind Emerald Summit ’27. Their profiles are coming soon.' },
];

export default function KeynoteTeamPage() {
  const location = useLocation();

  // The nav sends { scrollTo: 'team' } (or keynote) when it brings you here.
  useEffect(() => {
    const id = (location.state as { scrollTo?: string } | null)?.scrollTo;
    if (!id) return;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
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
              </div>
              <div className="lp-soon">
                <p className="lp-soon__tag">Coming soon</p>
                <p>{s.text}</p>
              </div>
            </div>
          </section>
        ))}
      </main>
      <LandingFooter />
    </div>
  );
}
