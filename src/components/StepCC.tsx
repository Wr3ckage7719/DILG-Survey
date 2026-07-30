import { cn } from '@/lib/utils';
import type { FormData } from '../types';
import { CC1_OPTIONS, CC2_OPTIONS, CC3_OPTIONS } from '../data/questions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check } from 'lucide-react';

interface Props {
  num: 1 | 2 | 3;
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors?: Record<string, boolean>;
}

const CC_TITLES: Record<number, string> = {
  1: 'CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?',
  2: 'CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:',
  3: 'CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?',
};

const CC_OPTIONS: Record<number, string[]> = { 1: CC1_OPTIONS, 2: CC2_OPTIONS, 3: CC3_OPTIONS };
const CC_KEYS = ['cc1', 'cc2', 'cc3'] as const;

export default function StepCC({ num, form, onChange, errors }: Props) {
  const key = CC_KEYS[num - 1];
  const options = CC_OPTIONS[num];
  const title = CC_TITLES[num];
  const hasError = errors?.[key];

  return (
    <fieldset
      className={cn('space-y-3', hasError && 'rounded-xl ring-2 ring-destructive p-3 -mx-2')}
      data-error-field={key}
    >
      <p
        className={cn(
          'text-sm font-semibold leading-relaxed',
          hasError ? 'text-destructive' : 'text-foreground',
        )}
      >
        {title}
      </p>
      <RadioGroup
        value={form[key]}
        onValueChange={(v) => onChange({ [key]: v } as Partial<FormData>)}
      >
        {options.map((o, i) => {
          const isSelected = form[key] === o;
          return (
            <div
              key={i}
              onClick={() => onChange({ [key]: o } as Partial<FormData>)}
              className={cn(
                'flex items-start gap-3.5 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors',
                isSelected
                  ? 'border-l-4 border-l-primary border-primary/30 bg-primary/[0.06] font-medium'
                  : 'border-input hover:bg-accent/60',
              )}
            >
              <RadioGroupItem value={o} className="mt-0.5 pointer-events-none" />
              <span className="text-sm flex-1 leading-relaxed">{o}</span>
              {isSelected && (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" absoluteStrokeWidth />
              )}
            </div>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
