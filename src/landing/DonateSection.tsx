// The landing page's Donate section, the last before Contact: why to give, then
// Donate (EAF's Zeffy donation form, in the same popup as Home's Support EAF
// card; a new tab on phones) and Volunteer with EAF. The buttons share the
// Sponsors section's bigger landing style (landing.css, .lp-donate__actions).
import { DonateButton, EAF_VOLUNTEER_URL, LinkButton } from '../components/home/AboutSections';

export default function DonateSection() {
  return (
    <section id="donate" className="lp-section lp-donate" aria-labelledby="donate-title">
      <div className="container lp-donate__inner">
        <h2 id="donate-title">Want to help keep the Summit free?</h2>
        <p className="lp-donate__lede">
          Emerald Summit is free to attend. It’s an initiative of the Emerald Academic Foundation (EAF), a 501(c)(3)
          nonprofit that backs student-initiated projects like the Summit and this site. A donation of any size goes
          to EAF, and it’s tax-deductible.
        </p>
        <div className="lp-donate__actions">
          <DonateButton />
          <LinkButton href={EAF_VOLUNTEER_URL}>Volunteer with EAF</LinkButton>
        </div>
      </div>
    </section>
  );
}
