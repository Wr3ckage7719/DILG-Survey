import type { FormData } from '../types';
import { CC1_OPTIONS, CC2_OPTIONS, CC3_OPTIONS } from '../data/questions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Props {
  num: 1 | 2 | 3;
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

const CC_TITLES: Record<number, string> = {
  1: 'CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?',
  2: 'CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:',
  3: 'CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?',
};

const CC_OPTIONS: Record<number, string[]> = { 1: CC1_OPTIONS, 2: CC2_OPTIONS, 3: CC3_OPTIONS };
const CC_KEYS = ['cc1', 'cc2', 'cc3'] as const;

export default function StepCC({ num, form, onChange }: Props) {
  const key = CC_KEYS[num - 1];
  const options = CC_OPTIONS[num];
  const title = CC_TITLES[num];

  return (
    <fieldset className="space-y-3">
      <p className="text-sm font-semibold text-foreground leading-relaxed">{title}</p>
      <RadioGroup
        value={form[key]}
        onValueChange={(v) => onChange({ [key]: v } as Partial<FormData>)}
      >
        {options.map((o, i) => (
          <div
            key={i}
            onClick={() => onChange({ [key]: o } as Partial<FormData>)}
            className={`flex items-start gap-3.5 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${
              form[key] === o
                ? 'border-primary/30 bg-primary/[0.04]'
                : 'border-input hover:bg-accent'
            }`}
          >
            <RadioGroupItem value={o} className="mt-0.5 pointer-events-none" />
            <span className="text-sm flex-1 leading-relaxed">{o}</span>
          </div>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
