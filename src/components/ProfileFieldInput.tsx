// One sign-up question (models/profileFields.ts), the way the app draws it:
// a text box, or for school the Tri-Valley dropdown with an "Other" box.
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { matchTriValleySchool, TRI_VALLEY_SCHOOLS } from '../models/schools';
import { gradeOptionLabel, PARTICIPANT_GRADES, type ProfileField } from '../models/profileFields';
import { gradeLabel } from '../models/metrics';

const OTHER = '__other__';
const FIELD_CLASS = 'h-12 rounded-xl bg-secondary/40 text-[15px]';

export default function ProfileFieldInput({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.key}`;
  const helperId = field.helper ? `${id}-help` : undefined;
  const helper = field.helper && <p id={helperId} className="mt-1.5 text-[12px] text-muted-foreground">{field.helper}</p>;

  if (field.schoolPicker) return <SchoolPicker field={field} value={value} onChange={onChange} />;
  if (field.gradePicker) return <GradePicker field={field} value={value} onChange={onChange} />;

  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-[13px] font-semibold">{field.label}</Label>
      {field.multiline ? (
        <Textarea
          id={id}
          rows={2}
          required={field.required}
          placeholder={field.hint}
          aria-describedby={helperId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl bg-secondary/40 text-[15px]"
        />
      ) : (
        <Input
          id={id}
          type={field.type === 'tel' ? 'tel' : 'text'}
          inputMode={field.type === 'digits' || field.type === 'tel' ? 'numeric' : undefined}
          autoComplete={field.type === 'tel' ? 'tel' : undefined}
          required={field.required}
          placeholder={field.hint}
          aria-describedby={helperId}
          value={value}
          onChange={(e) => onChange(cleanValue(field.type, e.target.value))}
          className={FIELD_CLASS}
        />
      )}
      {helper}
    </div>
  );
}

/**
 * Phone numbers and digit fields take numbers only: spaces, dashes, brackets
 * and + are dropped as you type or paste, so "(925) 555-0100" becomes
 * 9255550100. A phone keeps at most 10 digits, like the app.
 */
export function cleanValue(type: ProfileField['type'], raw: string): string {
  if (type === 'tel') return raw.replace(/\D/g, '').slice(0, 10);
  if (type === 'digits') return raw.replace(/\D/g, '');
  return raw;
}

function SchoolPicker({ field, value, onChange }: { field: ProfileField; value: string; onChange: (v: string) => void }) {
  const listed = matchTriValleySchool(value);
  const [other, setOther] = useState(value.trim() !== '' && listed == null);
  const id = `field-${field.key}`;
  const selected = listed ? listed.name : other ? OTHER : '';
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="block text-[13px] font-semibold">{field.label}</Label>
      <select
        id={id}
        required={field.required}
        aria-describedby={field.helper ? `${id}-help` : undefined}
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          if (v === OTHER) {
            setOther(true);
            onChange('');
          } else {
            setOther(false);
            onChange(v);
          }
        }}
        className="h-12 w-full rounded-xl border border-input bg-secondary/40 px-3 text-[15px]"
      >
        <option value="">{field.required ? 'Choose your school' : 'None'}</option>
        {TRI_VALLEY_SCHOOLS.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.city})</option>)}
        <option value={OTHER}>Other (not listed)</option>
      </select>
      {other && (
        <Input
          aria-label="School name"
          placeholder="School name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={FIELD_CLASS}
        />
      )}
      {field.helper && <p id={`${id}-help`} className="text-[12px] text-muted-foreground">{field.helper}</p>}
    </div>
  );
}

/**
 * A participant's grade: a dropdown of 8th to 12th grade, saved as "8" to
 * "12" (the app's GradePicker). An older typed answer ("11th", "Junior")
 * shows as its grade; anything else shows empty so it gets picked again.
 */
function GradePicker({ field, value, onChange }: { field: ProfileField; value: string; onChange: (v: string) => void }) {
  const id = `field-${field.key}`;
  const helperId = field.helper ? `${id}-help` : undefined;
  const normalized = gradeLabel(value);
  const selected = (PARTICIPANT_GRADES as readonly string[]).includes(normalized) ? normalized : '';
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-[13px] font-semibold">{field.label}</Label>
      <select
        id={id}
        required={field.required}
        aria-describedby={helperId}
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-input bg-secondary/40 px-3 text-[15px]"
      >
        <option value="" disabled>Choose your grade</option>
        {PARTICIPANT_GRADES.map((g) => <option key={g} value={g}>{gradeOptionLabel(g)}</option>)}
      </select>
      {field.helper && <p id={helperId} className="mt-1.5 text-[12px] text-muted-foreground">{field.helper}</p>}
    </div>
  );
}
