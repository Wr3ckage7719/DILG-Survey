import type { FormData } from '../types';
import { KLIYENTE, EDAD, KASARIAN, REGIONS } from '../data/questions';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepDemographics({ form, onChange }: Props) {
  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardContent className="p-6 space-y-6">
        <RadioGroupBlock label="Uri ng Kliyente" options={KLIYENTE} value={form.uriNgKliyente} onChange={(v) => onChange({ uriNgKliyente: v })} />
        <RadioGroupBlock label="Edad" options={EDAD} value={form.edad} onChange={(v) => onChange({ edad: v })} />
        <RadioGroupBlock label="Kasarian" options={KASARIAN} value={form.kasarian} onChange={(v) => onChange({ kasarian: v })} />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Rehiyon ng tirahan</label>
          <Select value={form.rehiyon} onValueChange={(v) => onChange({ rehiyon: v })}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="— Pumili —" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
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
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{props.label}</label>
      <RadioGroup value={props.value} onValueChange={props.onChange}>
        {props.options.map((o) => (
          <div
            key={o}
            onClick={() => props.onChange(o)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors ${
              props.value === o
                ? 'border-primary/50 bg-accent'
                : 'border-input hover:bg-accent'
            }`}
          >
            <RadioGroupItem value={o} className="pointer-events-none" />
            <span className="text-sm flex-1">{o}</span>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
