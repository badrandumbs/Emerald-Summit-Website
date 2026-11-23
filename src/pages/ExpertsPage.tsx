// The public Experts page (/experts, Nov 23, 2026), from the landing nav's
// Experts link: every approved expert serving in a track, filled in by itself
// (ExpertsDirectory). Signed-in people also find it as Summit '27's Experts tab.
import LandingNav from '../components/LandingNav';
import LandingFooter from '../components/LandingFooter';
import ExpertsDirectory, { EXPERTS_INTRO } from '../components/ExpertsDirectory';
import '../landing/landing.css';

export default function ExpertsPage() {
  return (
    <div className="lp lp-page">
      <LandingNav />
      <main id="main" className="lp-lineup">
        <section id="experts" className="lp-section" aria-labelledby="experts-title">
          <div className="container">
            <div className="lp-head">
              <h1 id="experts-title" style={{ fontSize: 'var(--text-section)', maxWidth: '30ch' }}>Experts</h1>
              <p className="lead">{EXPERTS_INTRO}</p>
            </div>
            <ExpertsDirectory />
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
