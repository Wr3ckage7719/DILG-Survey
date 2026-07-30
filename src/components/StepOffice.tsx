import type { FormData } from '../types';
import { Fragment } from 'react';
import { OFFICES, SERVICE_GROUPS } from '../data/questions';
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors: Record<string, boolean>;
}

export default function StepOffice({ form, onChange, errors }: Props) {
  return (
    <div className="space-y-7">
      <fieldset className="space-y-2" data-error-field="pangalanNgTanggapan">
        <label className="text-sm font-semibold text-foreground">
          Pangalan ng tanggapan / operating unit
          <BadgeKailangan />
        </label>
        <Select
          value={form.pangalanNgTanggapan}
          onValueChange={(v) => onChange({ pangalanNgTanggapan: v })}
        >
          <SelectTrigger
            className={cn(
              'w-full rounded-xl',
              errors.pangalanNgTanggapan && 'ring-2 ring-destructive border-destructive',
            )}
          >
            <SelectValue placeholder="— Pumili —" />
          </SelectTrigger>
          <SelectContent>
            {OFFICES.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </fieldset>

      <fieldset className="space-y-2" data-error-field="serbisyongIbinigay">
        <label className="text-sm font-semibold text-foreground">
          Serbisyong ibinigay
          <BadgeKailangan />
        </label>
        <Select
          value={form.serbisyongIbinigay}
          onValueChange={(v) => onChange({ serbisyongIbinigay: v })}
        >
          <SelectTrigger
            className={cn(
              'w-full rounded-xl',
              errors.serbisyongIbinigay && 'ring-2 ring-destructive border-destructive',
            )}
          >
            <SelectValue placeholder="— Pumili —" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_GROUPS.map((group, gi) => (
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

      {form.serbisyongIbinigay === 'Other/s (Tukuyin ang iba pang serbisyo)' && (
        <div className="ml-2 pl-4 border-l-2 border-primary/30">
          <label className="block text-sm font-medium text-foreground mb-1">
            Tukuyin ang iba pang serbisyo:
          </label>
          <Input
            placeholder="Ilagay ang serbisyo..."
            value={form.serbisyongIba}
            onChange={(e) => onChange({ serbisyongIba: e.target.value })}
            className="rounded-xl"
          />
        </div>
      )}
    </div>
  );
}

function BadgeKailangan() {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/[0.09] px-1.5 py-[1px] text-[10px] font-medium tracking-wide text-primary align-middle">
      kailangan
    </span>
  );
}
