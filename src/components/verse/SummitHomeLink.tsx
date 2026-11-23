import { Link } from 'react-router-dom';
import SummitLogo from '../SummitLogo';
import { rgba, type VerseVibe } from '../../models/verseVibes';

/**
 * The Summit logo and "Emerald Summit ’27", top right of every discipline
 * and track page. These pages are full screen with no sidebar, so this is
 * their way home: it goes to the dashboard (/home), not the landing page.
 */
export default function SummitHomeLink({ vibe }: { vibe: VerseVibe }) {
  return (
    <Link
      to="/home"
      aria-label="Emerald Summit ’27, back to home"
      className="group inline-flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-3.5 transition-colors"
      style={{ background: rgba(vibe.surface, 0.7), color: vibe.text }}
    >
      <span className="h-8 w-8 shrink-0 transition-transform duration-200 group-hover:scale-105">
        <SummitLogo />
      </span>
      <span className="whitespace-nowrap font-display text-sm font-bold tracking-tight">
        Emerald Summit ’27
      </span>
    </Link>
  );
}
