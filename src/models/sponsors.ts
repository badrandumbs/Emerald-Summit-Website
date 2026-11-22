// The Summit's sponsor tiers and sponsors, shown signed-in only on the Summit
// '27 page's Sponsors subtab (src/pages/Summit27Page.tsx); the landing page's
// terraces (src/landing/SponsorTerraces.tsx) are not rendered. Tiers and the contact
// come from EAF's real site, ehsacademics.org (Initiatives → Emerald Summit
// '27 → Sponsor; checked Nov 14, 2026).

const EAF_SITE = 'https://www.ehsacademics.org';
export const SPONSORSHIP_DETAILS_URL = `${EAF_SITE}/initiatives/emerald-summit-27/sponsor`;
/** The sponsor page says "Questions? Email contact@ehsacademics.org" (its sign-up form is closed). */
export const SPONSOR_EMAIL = 'contact@ehsacademics.org';

/**
 * EAF's Zeffy form for sponsors ("Be the Catalyst for Learning and Discovery",
 * sent by the organizers on Nov 22, 2026). A separate form from the Donate one.
 * Become a sponsor opens it in a popup (a new tab on phones), like Donate.
 */
const SPONSOR_ZEFFY_FORM = 'be-the-catalyst-for-learning-and-discovery';
export const SPONSOR_FORM_URL = `https://www.zeffy.com/en-US/donation-form/${SPONSOR_ZEFFY_FORM}`;
export const SPONSOR_FORM_EMBED_URL = `https://www.zeffy.com/embed/donation-form/${SPONSOR_ZEFFY_FORM}`;

export type SponsorTierName = 'Capstone' | 'Keystone' | 'Pillar' | 'Foundation' | 'Cornerstone';

/**
 * Highest tier first: the order the Sponsors section ranks them in. From the
 * Sponsorship Tiers table on EAF's sponsor page; each includes the ones below.
 */
export const SPONSOR_TIERS: { name: SponsorTierName; amount: string; perks: string }[] = [
  { name: 'Capstone', amount: '$5,000', perks: 'Everything in Keystone, plus a year-long portal link' },
  { name: 'Keystone', amount: '$2,000', perks: "Everything in Pillar, plus a month-long portal link, visibility on the EAF portal and an ad on the ES'27 app" },
  { name: 'Pillar', amount: '$1,500', perks: 'Everything in Foundation, plus a table or flyers in the Student Union for 2 hours, or a banner at a discipline of your choice' },
  { name: 'Foundation', amount: '$1,000', perks: 'Everything in Cornerstone, plus a banner at the entrance' },
  { name: 'Cornerstone', amount: '$500', perks: 'A mention in the keynote and your logo on the event slides' },
];

export interface Sponsor {
  name: string;
  tier: SponsorTierName;
  /** Their website; the logo links straight to it. */
  url: string;
  /** Logo under public/, on a white background. */
  logo: string;
}

/**
 * The Summit '27 sponsors. Empty until this year's are confirmed (the four
 * listed before were last year's). Add one here with its logo in
 * public/sponsors/ and it shows up on its tier's terrace.
 */
export const SPONSORS: Sponsor[] = [];
