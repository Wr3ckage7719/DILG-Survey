import type { FormData } from '../types';
import { SQD_LABELS, SQD_OPTIONS, localizedOf } from '../data/questions';
import { useLang } from '../i18n/LanguageContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface Props {
  index: number; // 0–8
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepSQD({ index, form, onChange }: Props) {
  const { lang } = useLang();
  const label = SQD_LABELS[lang][index];
  const displayValue = localizedOf(SQD_OPTIONS, lang, form.sqd[index]);

  return (
    <fieldset className="space-y-3">
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
          <div
            key={opt}
            onClick={() => {
              const next = [...form.sqd];
              next[index] = opt;
              onChange({ sqd: next });
            }}
            className={cn(
              'flex items-center gap-3.5 rounded-2xl border px-5 py-3.5 cursor-pointer transition-colors duration-200 text-[15px]',
              isSelected
                ? 'border-accent/20 bg-accent/[0.04] font-medium'
                : 'border-border/80 bg-card hover:bg-accent/5 hover:border-border',
            )}
          >
              <RadioGroupItem value={opt} className="pointer-events-none" />
              <span className="text-sm flex-1 leading-relaxed">{opt}</span>
            </div>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
