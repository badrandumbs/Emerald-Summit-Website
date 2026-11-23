import { TEAM_MEMBERS } from '../models/team';
import TeamLinkedText from './TeamLinkedText';

export const TEAM_INTRO = 'Meet the students and organizers behind Emerald Summit ’27.';

/** Shared profiles for the public Team section and the signed-in Team tab. */
export default function TeamDirectory() {
  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{TEAM_INTRO}</p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Summit team">
        {TEAM_MEMBERS.map((member) => (
          <li key={member.id} className="min-w-0">
            <article className="h-full space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6">
              <div className="space-y-2">
                <h3 className="break-words font-display text-xl font-semibold leading-snug">{member.name}</h3>
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-emerald">
                  <TeamLinkedText text={member.role} mentions={member.mentions} />
                </p>
              </div>
              <p className="break-words text-[15px] leading-relaxed text-muted-foreground">
                <TeamLinkedText text={member.bio} mentions={member.mentions} />
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
