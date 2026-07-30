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
      <RadioGroupBlock label="Uri ng Kliyente" options={KLIYENTE} value={form.uriNgKliyente} onChange={(v) => onChange({ uriNgKliyente: v })} errorKey="uriNgKliyente" errors={errors} />
      <RadioGroupBlock label="Edad" options={EDAD} value={form.edad} onChange={(v) => onChange({ edad: v })} errorKey="edad" errors={errors} />
      <RadioGroupBlock label="Kasarian" options={KASARIAN} value={form.kasarian} onChange={(v) => onChange({ kasarian: v })} errorKey="kasarian" errors={errors} />

      <fieldset className="space-y-2" data-error-field="rehiyon">
        <label className="text-sm font-semibold text-foreground">Rehiyon ng tirahan</label>
        <Select value={form.rehiyon} onValueChange={(v) => onChange({ rehiyon: v })}>
          <SelectTrigger
            className={cn(
              'w-full rounded-xl',
              errors.rehiyon && 'ring-2 ring-destructive border-destructive',
            )}
          >
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
}) {
  const hasError = props.errorKey && props.errors?.[props.errorKey];
  return (
    <fieldset
      className={cn('space-y-3', hasError && 'rounded-xl ring-2 ring-destructive p-3 -mx-2')}
      data-error-field={props.errorKey}
    >
      <label
        className={cn(
          'text-sm font-semibold',
          hasError ? 'text-destructive' : 'text-foreground',
        )}
      >
        {props.label}
      </label>
      <RadioGroup value={props.value} onValueChange={props.onChange}>
        {props.options.map((o) => (
          <div
            key={o}
            onClick={() => props.onChange(o)}
            className={`flex items-center gap-3.5 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
              props.value === o
                ? 'border-primary/30 bg-primary/[0.04]'
                : 'border-input hover:bg-accent'
            }`}
          >
            <RadioGroupItem value={o} className="pointer-events-none" />
            <span className="text-sm flex-1 leading-relaxed">{o}</span>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
