import type { FormData } from '../types';
import { SQD_LABELS, SQD_OPTIONS, localizedOf } from '../data/questions';
import { useLang } from '../i18n/LanguageContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface Props {
  index: number; // 0–8
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  error?: boolean;
}

export default function StepSQD({ index, form, onChange, error = false }: Props) {
  const { lang } = useLang();
  const label = SQD_LABELS[lang][index];
  const displayValue = localizedOf(SQD_OPTIONS, lang, form.sqd[index]);

  return (
    <fieldset
      className={cn('space-y-3', error && 'rounded-2xl ring-2 ring-destructive/60 ring-offset-2')}
      data-error-field={`sqd${index}`}
      aria-invalid={error || undefined}
    >
      <p className="text-[15px] font-semibold text-foreground leading-relaxed">{label}</p>
      <RadioGroup
        value={displayValue}
        onValueChange={(v) => {
          const next = [...form.sqd];
          next[index] = v;
          onChange({ sqd: next });
        }}
      >
        {SQD_OPTIONS[lang].map((opt) => {
          const isSelected = displayValue === opt;
          return (
            <label
              key={opt}
              className={cn(
                'flex items-center gap-3.5 rounded-2xl border px-5 py-3.5 cursor-pointer transition-colors duration-200 text-[15px]',
                isSelected
                  ? 'border-accent/20 bg-accent/[0.04] font-medium'
                  : 'border-border/80 bg-card hover:bg-accent/5 hover:border-border',
              )}
            >
              <RadioGroupItem value={opt} />
              <span className="text-sm flex-1 leading-relaxed">{opt}</span>
            </label>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
