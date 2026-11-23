// The expert's LinkedIn choice on sign-up, Change role and Edit profile:
// show it to students (with the link) or keep it private.
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import LinkedInIcon from './LinkedInIcon';
import {
  LINKEDIN_CHOICE, LINKEDIN_URL_KEY, LINKEDIN_VISIBLE_KEY, linkedInVisible, type LinkedInVisible,
} from '../models/expertLinkedIn';

export default function ExpertLinkedInChoice({
  answers,
  onChange,
  compact = false,
}: {
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Edit profile's smaller type. */
  compact?: boolean;
}) {
  const visible = linkedInVisible(answers[LINKEDIN_VISIBLE_KEY]);
  const options: [LinkedInVisible, string][] = [['yes', LINKEDIN_CHOICE.yes], ['no', LINKEDIN_CHOICE.no]];
  return (
    <fieldset className="space-y-3">
      <legend className={cn('mb-2 flex items-center gap-2 font-semibold', compact ? 'text-sm' : 'text-[15px]')}>
        <LinkedInIcon size={16} />
        {LINKEDIN_CHOICE.heading}
      </legend>
      <p className={cn('text-muted-foreground', compact ? 'text-[13px]' : 'text-[14px]')}>{LINKEDIN_CHOICE.prompt}</p>
      {options.map(([value, label]) => (
        <label key={value} className={cn('flex cursor-pointer items-start gap-3 leading-relaxed', compact ? 'text-sm' : 'text-[15px]')}>
          <input
            type="radio"
            name="linkedin-visible"
            checked={visible === value}
            onChange={() => onChange(LINKEDIN_VISIBLE_KEY, value)}
            className="mt-1 h-[18px] w-[18px] shrink-0 accent-emerald"
          />
          <span>{label}</span>
        </label>
      ))}
      {visible === 'yes' && (
        <div className="pl-[30px]">
          <Label htmlFor="linkedin-url" className="mb-2 block text-[13px] font-semibold">{LINKEDIN_CHOICE.urlLabel}</Label>
          <Input
            id="linkedin-url"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder={LINKEDIN_CHOICE.urlHint}
            value={answers[LINKEDIN_URL_KEY] ?? ''}
            onChange={(e) => onChange(LINKEDIN_URL_KEY, e.target.value)}
            className={compact ? undefined : 'h-12 rounded-xl bg-secondary/40 text-[15px]'}
          />
        </div>
      )}
    </fieldset>
  );
}
