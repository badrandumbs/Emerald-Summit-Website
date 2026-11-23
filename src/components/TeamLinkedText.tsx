import { Link, useLocation } from 'react-router-dom';
import type { TeamMention } from '../models/team';
import { teamLinkHref, teamTextParts } from '../models/teamLinks';

export default function TeamLinkedText({ text, mentions }: {
  text: string;
  mentions: readonly TeamMention[];
}) {
  const { pathname } = useLocation();
  const teamReturnTo = pathname === '/summit-27/team' ? pathname : '/keynote-and-team';
  return (
    <>
      {teamTextParts(text, mentions).map((part, index) => part.target ? (
        <Link
          key={index}
          to={teamLinkHref(part.target)}
          state={{ teamReturnTo }}
          className="text-emerald underline decoration-emerald/40 underline-offset-2 hover:decoration-emerald focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {part.text}
        </Link>
      ) : part.text)}
    </>
  );
}
