// The expert's LinkedIn choice: attach it to their expert profile (with the
// link) or leave it off. In the Serve in this track popup and Edit profile.
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import LinkedInIcon from './LinkedInIcon';
import {
  LINKEDIN_CHOICE, LINKEDIN_OWN_PROFILE_URL, LINKEDIN_URL_KEY, LINKEDIN_VISIBLE_KEY, linkedInVisible, type LinkedInVisible,
} from '../models/expertLinkedIn';

export default function ExpertLinkedInChoice({
  answers,
  onChange,
  compact = false,
  showHeading = true,
}: {
  answers: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** Edit profile's smaller type. */
  compact?: boolean;
  /** The popup has its own title, so it leaves out the LinkedIn heading. */
  showHeading?: boolean;
}) {
  const visible = linkedInVisible(answers[LINKEDIN_VISIBLE_KEY]);
  const options: [LinkedInVisible, string][] = [['yes', LINKEDIN_CHOICE.yes], ['no', LINKEDIN_CHOICE.no]];
  return (
    <fieldset className="space-y-3">
      <legend className={cn(showHeading ? 'mb-2 flex items-center gap-2 font-semibold' : 'sr-only', compact ? 'text-sm' : 'text-[15px]')}>
        <LinkedInIcon size={16} />
        {LINKEDIN_CHOICE.heading}
      </legend>
      <p className={cn(showHeading ? 'text-muted-foreground' : 'font-semibold', compact ? 'text-[13px]' : 'text-[15px]')}>{LINKEDIN_CHOICE.prompt}</p>
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
            aria-describedby="linkedin-url-help"
            className={compact ? undefined : 'h-12 rounded-xl bg-secondary/40 text-[15px]'}
          />
          <p id="linkedin-url-help" className="mt-1.5 text-[12px] text-muted-foreground">
            <a href={LINKEDIN_OWN_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald underline-offset-4 hover:underline">
              {LINKEDIN_CHOICE.findLink}
            </a>{' '}
            {LINKEDIN_CHOICE.findHelp}
          </p>
        </div>
      )}
    </fieldset>
  );
}
