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
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
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
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors ${
              value === opt
                ? 'border-primary/50 bg-accent'
                : 'border-input hover:bg-accent'
            }`}
          >
            <RadioGroupItem value={opt} className="pointer-events-none" />
            <span className="text-sm flex-1">{opt}</span>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
