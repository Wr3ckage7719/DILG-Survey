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

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepDemographics({ form, onChange }: Props) {
  return (
    <div className="space-y-8">
      <RadioGroupBlock label="Uri ng Kliyente" options={KLIYENTE} value={form.uriNgKliyente} onChange={(v) => onChange({ uriNgKliyente: v })} />
      <RadioGroupBlock label="Edad" options={EDAD} value={form.edad} onChange={(v) => onChange({ edad: v })} />
      <RadioGroupBlock label="Kasarian" options={KASARIAN} value={form.kasarian} onChange={(v) => onChange({ kasarian: v })} />

      <fieldset className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Rehiyon ng tirahan</label>
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
}) {
  return (
    <fieldset className="space-y-3">
      <label className="text-sm font-semibold text-foreground">{props.label}</label>
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
