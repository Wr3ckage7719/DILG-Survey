import { cn } from '@/lib/utils';
import type { FormData } from '../types';
import { CC1_OPTIONS, CC2_OPTIONS, CC3_OPTIONS, localizedOf } from '../data/questions';
import { useLang } from '../i18n/LanguageContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Props {
  num: 1 | 2 | 3;
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors?: Record<string, boolean>;
}

const CC_OPTIONS: Record<number, Record<'tl' | 'en', string[]>> = {
  1: CC1_OPTIONS,
  2: CC2_OPTIONS,
  3: CC3_OPTIONS,
};

const CC_TITLE_KEYS: Record<number, 'cc.title1' | 'cc.title2' | 'cc.title3'> = {
  1: 'cc.title1',
  2: 'cc.title2',
  3: 'cc.title3',
};

const CC_KEYS = ['cc1', 'cc2', 'cc3'] as const;

export default function StepCC({ num, form, onChange, errors }: Props) {
  const { lang, t } = useLang();
  const key = CC_KEYS[num - 1];
  const options = CC_OPTIONS[num][lang];
  const title = t(CC_TITLE_KEYS[num]);
  const hasError = errors?.[key];
  const displayValue = localizedOf(CC_OPTIONS[num], lang, form[key]);

  return (
    <fieldset
      className="space-y-3"
      data-error-field={key}
      aria-invalid={hasError || undefined}
    >
      <p className="text-[15px] font-semibold leading-relaxed text-foreground">
        {title}
      </p>
      <RadioGroup
        value={displayValue}
        onValueChange={(v) => onChange({ [key]: v } as Partial<FormData>)}
      >
        {options.map((o, i) => {
          const isSelected = displayValue === o;
          return (
          <label
            key={i}
            className={cn(
              'flex items-start gap-3.5 rounded-2xl border px-5 py-3.5 cursor-pointer transition-colors duration-200 text-[15px]',
              isSelected
                ? 'border-accent/20 bg-accent/[0.04] font-medium'
                : 'border-border/80 bg-card hover:bg-accent/5 hover:border-border',
            )}
          >
              <RadioGroupItem value={o} className="mt-0.5" />
              <span className="text-sm flex-1 leading-relaxed">{o}</span>
            </label>
          );
        })}
      </RadioGroup>
      {hasError && (
        <p role="alert" className="text-xs text-destructive pl-1">{t('cc.select')}</p>
      )}
    </fieldset>
  );
}
