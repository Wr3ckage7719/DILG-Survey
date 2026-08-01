import type { FormData } from '../types';
import { KLIYENTE, EDAD, KASARIAN, REGION_GROUPS } from '../data/questions';
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
  return (
    <div className="space-y-8">
      <RadioGroupBlock label="Uri ng Kliyente" options={KLIYENTE} value={form.uriNgKliyente} onChange={(v) => onChange({ uriNgKliyente: v })} errorKey="uriNgKliyente" errors={errors} required />
      <RadioGroupBlock label="Edad" options={EDAD} value={form.edad} onChange={(v) => onChange({ edad: v })} errorKey="edad" errors={errors} required />
      <RadioGroupBlock label="Kasarian" options={KASARIAN} value={form.kasarian} onChange={(v) => onChange({ kasarian: v })} errorKey="kasarian" errors={errors} required />

      <fieldset className="space-y-2" data-error-field="rehiyon">
        <label className="text-[15px] font-semibold text-foreground">
          Rehiyon ng tirahan
          <RequiredIcon />
        </label>
        <Select value={form.rehiyon} onValueChange={(v) => onChange({ rehiyon: v })}>
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="— Pumili —" />
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
          <p className="text-xs text-destructive/70 pl-1">Pumili ng rehiyon</p>
        )}
      </fieldset>
    </div>
  );
}

/* ─── radio group block ─── */

function RadioGroupBlock(props: {
  label: string;
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
    >
      <label className="text-[15px] font-semibold text-foreground">
        {props.label}
        {props.required && <RequiredIcon />}
      </label>
      <RadioGroup value={props.value} onValueChange={props.onChange}>
        {props.options.map((o) => (
        <div
          key={o}
          onClick={() => props.onChange(o)}
          className={cn(
            'flex items-center gap-3.5 rounded-2xl border px-5 py-3.5 cursor-pointer transition-colors duration-200 text-[15px]',
            isSelected(o)
              ? 'border-accent/20 bg-accent/[0.04] font-medium'
              : 'border-border/80 bg-card hover:bg-accent/5 hover:border-border',
          )}
        >
            <RadioGroupItem value={o} className="pointer-events-none" />
            <span className="text-sm flex-1 leading-relaxed">{o}</span>
          </div>
        ))}
      </RadioGroup>
      {hasError && (
        <p className="text-xs text-destructive/70 pl-1">Pumili ng {props.label.toLowerCase()}</p>
      )}
    </fieldset>
  );
}

function RequiredIcon() {
  return (
    <span className="ml-1 text-destructive text-sm font-bold leading-none" aria-label="required">*</span>
  );
}
