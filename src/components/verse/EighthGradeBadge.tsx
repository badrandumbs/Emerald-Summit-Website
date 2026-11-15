// Marks a session an 8th-grade participant can register to participate in
// (sessions.allow_eighth_graders), like the app's EighthGradeBadge. Shown only
// to 8th-grade participants (isEighthGradeParticipant).
import { Star } from '@/components/icons';
import { EIGHTH_GRADE_BADGE } from '../../models/registration';
import { rgba } from '../../models/verseVibes';

export default function EighthGradeBadge({ color }: { color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold"
      style={{ color, background: rgba(color, 0.14), border: `1px solid ${rgba(color, 0.45)}` }}
    >
      <Star className="h-3.5 w-3.5" aria-hidden /> {EIGHTH_GRADE_BADGE}
    </span>
  );
}
