import type { FormData } from '../types';
import { KLIYENTE, EDAD, KASARIAN, REGION_GROUPS, localizedOf } from '../data/questions';
import { useLang } from '../i18n/LanguageContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Fragment } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors: Record<string, boolean>;
}

export default function StepDemographics({ form, onChange, errors }: Props) {
  const { lang, t } = useLang();

  return (
    <div className="space-y-8">
      <RadioGroupBlock
        label={t('demo.clientType')}
        errorText={t('demo.clientTypeErr')}
        options={KLIYENTE[lang]}
        value={localizedOf(KLIYENTE, lang, form.uriNgKliyente)}
        onChange={(v) => onChange({ uriNgKliyente: v })}
        errorKey="uriNgKliyente"
        errors={errors}
        required
      />
      <RadioGroupBlock
        label={t('demo.age')}
        errorText={t('demo.ageErr')}
        options={EDAD[lang]}
        value={localizedOf(EDAD, lang, form.edad)}
        onChange={(v) => onChange({ edad: v })}
        errorKey="edad"
        errors={errors}
        required
      />
      <RadioGroupBlock
        label={t('demo.sex')}
        errorText={t('demo.sexErr')}
        options={KASARIAN[lang]}
        value={localizedOf(KASARIAN, lang, form.kasarian)}
        onChange={(v) => onChange({ kasarian: v })}
        errorKey="kasarian"
        errors={errors}
        required
      />

      <fieldset className="space-y-2" data-error-field="rehiyon">
        <label className="text-[15px] font-semibold text-foreground">
          {t('demo.region')}
          <RequiredIcon />
        </label>
        <Select value={form.rehiyon} onValueChange={(v) => onChange({ rehiyon: v })}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder={t('common.placeholder')} />
          </SelectTrigger>
          <SelectContent side="top">
            {REGION_GROUPS.map((group, gi) => (
              <Fragment key={gi}>
                {gi > 0 && <SelectSeparator />}
                <SelectGroup>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.items.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectGroup>
              </Fragment>
            ))}
          </SelectContent>
        </Select>
        {errors.rehiyon && (
          <p className="text-xs text-destructive/70 pl-1">{t('demo.regionErr')}</p>
        )}
      </fieldset>
    </div>
  );
}

/* ─── radio group block ─── */

function RadioGroupBlock(props: {
  label: string;
  errorText: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  errorKey?: string;
  errors?: Record<string, boolean>;
  required?: boolean;
}) {
  const hasError = props.errorKey && props.errors?.[props.errorKey];
  const isSelected = (option: string) => props.value === option;
  return (
    <fieldset
      className="space-y-3"
      data-error-field={props.errorKey}
      aria-invalid={hasError || undefined}
    >
      <label className="text-[15px] font-semibold text-foreground">
        {props.label}
        {props.required && <RequiredIcon />}
      </label>
      <RadioGroup value={props.value} onValueChange={props.onChange}>
        {props.options.map((o) => (
        <label
          key={o}
          className={cn(
            'flex items-center gap-3.5 rounded-2xl border px-5 py-3.5 cursor-pointer transition-colors duration-200 text-[15px]',
            isSelected(o)
              ? 'border-accent/20 bg-accent/[0.04] font-medium'
              : 'border-border/80 bg-card hover:bg-accent/5 hover:border-border',
          )}
        >
            <RadioGroupItem value={o} />
            <span className="text-sm flex-1 leading-relaxed">{o}</span>
          </label>
        ))}
      </RadioGroup>
      {hasError && (
        <p role="alert" className="text-xs text-destructive pl-1">{props.errorText}</p>
      )}
    </fieldset>
  );
}

function RequiredIcon() {
  return (
    <span className="ml-1 text-destructive text-sm font-bold leading-none" aria-label="required">*</span>
  );
}
