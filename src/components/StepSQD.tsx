import type { FormData } from '../types';
import { SQD_LABELS, SQD_OPTIONS } from '../data/questions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  index: number; // 0–8
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepSQD({ index, form, onChange }: Props) {
  const label = SQD_LABELS[index];
  const value = form.sqd[index];

  return (
    <fieldset className="space-y-3">
      <p className="text-sm font-semibold text-foreground leading-relaxed">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => {
          const next = [...form.sqd];
          next[index] = v;
          onChange({ sqd: next });
        }}
      >
        {SQD_OPTIONS.map((opt) => {
          const isSelected = value === opt;
          return (
            <div
              key={opt}
              onClick={() => {
                const next = [...form.sqd];
                next[index] = opt;
                onChange({ sqd: next });
              }}
              className={cn(
                'flex items-center gap-3.5 rounded-xl border px-4 py-3 cursor-pointer transition-colors',
                isSelected
                  ? 'border-l-4 border-l-primary border-primary/30 bg-primary/[0.06] font-medium'
                  : 'border-input hover:bg-accent/60',
              )}
            >
              <RadioGroupItem value={opt} className="pointer-events-none" />
              <span className="text-sm flex-1 leading-relaxed">{opt}</span>
              {isSelected && (
                <Check className="h-4 w-4 shrink-0 text-primary" absoluteStrokeWidth />
              )}
            </div>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
