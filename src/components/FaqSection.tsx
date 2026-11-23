import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from '@/components/icons';
import { cn } from '@/lib/utils';

interface FaqItem {
  q: string;
  a: ReactNode | readonly ReactNode[];
}

/** EAF's own page for parent and community volunteers (form + Be A Mentor step). */
const EAF_VOLUNTEER_URL = 'https://www.ehsacademics.org/get-involved/parent-volunteering';
const EXPERT_SIGN_UP_PATH = '/login/expert?mode=signup';
const CONTACT_EMAIL = 'contact@ehsacademics.org';

const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'Who can attend Emerald Summit?',
    a: 'Any Tri-Valley high schooler can participate, and 8th graders can in some tracks. Last year’s Summit drew 225+ signups from six schools. Bring a project or an idea to share, or come to look around as a spectator: curious minds of all ages are welcome. Middle schoolers and younger need a parent with them.',
  },
  {
    q: 'When and where is the next Summit?',
    a: 'Saturday, January 23, 2027, at Emerald High School, 3600 Central Pkwy, Dublin, CA.',
  },
  {
    q: 'Why is the Summit so early, in January?',
    a: 'So you have time to use what you learn. The feedback you get at the Summit leaves room to improve your research or project before Capstone, PLTW, and the competitions in March and April.',
  },
  {
    q: 'Does my project or research need to be perfect?',
    a: 'No. Do the best you can. Present your idea or project, where it stands so far, and your next steps toward the final goal, then get feedback and advice from experts. Use it as a stepping stone for Capstone, PLTW, or the March and April competitions, or put what you learn toward a passion project.',
  },
  {
    q: 'Why doesn’t the Summit give out awards?',
    a: 'Awards would only tell you who won. You’d lose the raw feedback: what you did well, where you can improve, and whether your roadmap needs a pivot. The Summit is about learning, picking up knowledge, and meeting experts and peers, so collaborate, share ideas, and grow. Every participant does receive a certificate of participation.',
  },
  {
    q: 'What will I take away from the Summit?',
    a: 'Personal feedback from industry professionals, educators, and mentors on what you did well and where to go next, new connections across schools and disciplines, and a clearer sense of direction for your project. Families and guests get to see interdisciplinary learning in action.',
  },
  {
    q: 'What are the six disciplines?',
    a: 'TechVerse, BioSphere, NovaSphere, ImagineX, VentureVerse, and CivicVerse, with 20+ tracks and 30+ visiting experts across them.',
  },
  {
    q: 'Do I need a team?',
    a: 'No. Come on your own or with friends. A team is never required.',
  },
  {
    q: 'Is it free?',
    a: 'Yes. Emerald Summit is free.',
  },
  {
    q: 'Do I need to be technical to join?',
    a: 'Not at all. The six disciplines span arts, business, civics, and science, as well as tech.',
  },
  {
    q: 'What’s the difference between participating and spectating?',
    a: 'Participants book a seat in a track to share their work and get feedback. Spectators sit in and watch. Both book seats in the schedule builder.',
  },
  {
    q: 'How can I get involved with Emerald Summit?',
    a: [
      'There are several ways to contribute!',
      'Emerald students: Sign up as a Volunteer to help organize and run the event.',
      <>
        EHS parents and community members: Volunteer through EAF on the{' '}
        <a className="lp-link" href={EAF_VOLUNTEER_URL} target="_blank" rel="noopener noreferrer">
          Parent Volunteering page
        </a>{' '}
        to support event operations. It also walks you through the required Be A Mentor sign-up. You can also
        sign up as an Expert to lead a track and share feedback with participating students (see below).
      </>,
      <>
        Professionals and subject-matter experts:{' '}
        <Link className="lp-link" to={EXPERT_SIGN_UP_PATH}>
          Sign up as an Expert
        </Link>{' '}
        right here on this site to lead a track, share your knowledge, and give students feedback.
      </>,
      <>
        Questions about any of these? Email{' '}
        <a className="lp-link" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </>,
      'We welcome everyone who wants to help make Emerald Summit a meaningful learning experience!',
    ],
  },
];

function FaqRow({
  item,
  index,
  open,
  onToggle,
}: {
  item: FaqItem;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `faq-answer-${index}`;
  return (
    <div className="lp-faq__row">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="lp-faq__q"
      >
        <span>{item.q}</span>
        <ChevronDown className="lp-faq__icon" aria-hidden />
      </button>
      <div id={panelId} className={cn('lp-faq__a', open && 'is-open')}>
        <div>
          {(Array.isArray(item.a) ? item.a : [item.a]).map((paragraph, i) => (
            // The list is fixed, so the index is a stable key.
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="lp-section lp-ruled" aria-labelledby="faq-title">
      <div className="container lp-grid">
        <div className="lp-faq__head">
          <h2 id="faq-title">Frequently Asked Questions</h2>
        </div>

        <div className="lp-faq__list">
          {FAQ_ITEMS.map((item, i) => (
            <FaqRow
              key={item.q}
              item={item}
              index={i}
              open={openIndex === i}
              onToggle={() => setOpenIndex((current) => (current === i ? null : i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
