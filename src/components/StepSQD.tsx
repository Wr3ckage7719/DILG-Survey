import type { FormData } from '../types';
import { SQD_LABELS, SQD_OPTIONS } from '../data/questions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
        {SQD_OPTIONS.map((opt) => (
          <div
            key={opt}
            onClick={() => {
              const next = [...form.sqd];
              next[index] = opt;
              onChange({ sqd: next });
            }}
            className={`flex items-center gap-3.5 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
              value === opt
                ? 'border-primary/30 bg-primary/[0.04]'
                : 'border-input hover:bg-accent'
            }`}
          >
            <RadioGroupItem value={opt} className="pointer-events-none" />
            <span className="text-sm flex-1 leading-relaxed">{opt}</span>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
