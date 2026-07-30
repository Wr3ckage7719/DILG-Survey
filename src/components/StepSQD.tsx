import type { FormData } from '../types';
import { SQD_LABELS, SQD_OPTIONS } from '../data/questions';
import { cn } from '@/lib/utils';

interface Props {
  index: number; // 0–8
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepSQD({ index, form, onChange }: Props) {
  const label = SQD_LABELS[index];
  const value = form.sqd[index];

  const handleSelect = (opt: string) => {
    const next = [...form.sqd];
    next[index] = opt;
    onChange({ sqd: next });
  };

  return (
    <fieldset className="space-y-3">
      <p className="text-sm font-semibold text-foreground leading-relaxed">{label}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SQD_OPTIONS.map((opt) => {
          const isSelected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-xs leading-tight text-center cursor-pointer transition-all select-none',
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'border-input bg-muted/40 hover:bg-accent/60 text-foreground',
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
