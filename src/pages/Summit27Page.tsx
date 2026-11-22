// The public Emerald Summit '27 page (/summit-27), linked from the landing
// page's navbar: more about the Summit, the guest speaker (coming soon), the
// sponsor terraces, donation links, and the team's About Me pages (coming soon). It's a landing page (LandingNav,
// LandingFooter, the .lp styles), open without signing in. Every fact comes from
// code the landing page and Home already use; nothing is filled in by hand.
import { useEffect } from 'react';
import { ArrowRight, HeartHandshake } from '@/components/icons';
import LandingNav from '../components/LandingNav';
import LandingFooter from '../components/LandingFooter';
import SponsorTerraces from '../landing/SponsorTerraces';
import { EAF_DONATE_URL, EAF_VOLUNTEER_URL } from '../components/home/AboutSections';
import { SUMMIT_LINKS } from '../components/home/LinksCard';
import { SUMMIT_ABOUT, SUMMIT_DATE, SUMMIT_HOURS, VENUE } from './WelcomePage';
import '../landing/landing.css';

const SUMMIT_WEBSITE = SUMMIT_LINKS.find((l) => l.label === 'Summit website')!.url;

export default function Summit27Page() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="lp lp-page">
      <LandingNav />
      <main id="main">
        <section className="lp-section" aria-labelledby="s27-title">
          <div className="container lp-grid">
            <div className="lp-s27__intro">
              <h1 id="s27-title">Emerald Summit '27</h1>
              <p className="lead">{SUMMIT_ABOUT}</p>
              <p className="lp-s27__when">
                <span>{SUMMIT_DATE}</span>
                <span>{SUMMIT_HOURS}</span>
                <span>{VENUE}</span>
              </p>
              <a href={SUMMIT_WEBSITE} target="_blank" rel="noreferrer" className="lp-btn lp-btn--quiet">
                Summit website <ArrowRight aria-hidden className="-rotate-45" />
              </a>
            </div>
          </div>
        </section>

        <section id="speaker" className="lp-section lp-s27__soon" aria-labelledby="speaker-title">
          <div className="container lp-grid">
            <div className="lp-s27__intro">
              <p className="lp-s27__tag">Coming soon</p>
              <h2 id="speaker-title">Who's the guest speaker?</h2>
              <p className="lead">This year's guest speaker will be announced soon.</p>
            </div>
          </div>
        </section>

        <SponsorTerraces />

        <section id="donate" className="lp-section" aria-labelledby="donate-title">
          <div className="container lp-grid">
            <div className="lp-s27__intro">
              <h2 id="donate-title">How can I support the Summit?</h2>
              <p className="lead">
                Emerald Summit is organized by the EHS Academic Foundation (EAF), which supports student-initiated
                projects that bring opportunities to students across many areas. Please consider supporting EAF and
                its mission.
              </p>
              <div className="lp-s27__actions">
                <a href={EAF_DONATE_URL} target="_blank" rel="noreferrer" className="lp-btn">
                  <HeartHandshake aria-hidden /> Donate to EAF
                </a>
                <a href={EAF_VOLUNTEER_URL} target="_blank" rel="noreferrer" className="lp-btn lp-btn--quiet">
                  Volunteer with EAF <ArrowRight aria-hidden className="-rotate-45" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="team" className="lp-section lp-s27__soon" aria-labelledby="team-title">
          <div className="container lp-grid">
            <div className="lp-s27__intro">
              <p className="lp-s27__tag">Coming soon</p>
              <h2 id="team-title">Who's running the Summit?</h2>
              <p className="lead">
                About Me pages for the students and organizers working on Emerald Summit '27 are coming soon.
              </p>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
