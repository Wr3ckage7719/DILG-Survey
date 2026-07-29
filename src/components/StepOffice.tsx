import type { FormData } from '../types';
import { OFFICES, SERVICES } from '../data/questions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepOffice({ form, onChange }: Props) {
  return (
    <div className="space-y-7">
      <fieldset className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Pangalan ng tanggapan / operating unit</label>
        <Select
          value={form.pangalanNgTanggapan}
          onValueChange={(v) => onChange({ pangalanNgTanggapan: v })}
        >
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="— Pumili —" />
          </SelectTrigger>
          <SelectContent>
            {OFFICES.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </fieldset>

      <fieldset className="space-y-2">
        <label className="text-sm font-semibold text-foreground">Serbisyong ibinigay</label>
        <Select
          value={form.serbisyongIbinigay}
          onValueChange={(v) => onChange({ serbisyongIbinigay: v })}
        >
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder="— Pumili —" />
          </SelectTrigger>
          <SelectContent>
            {SERVICES.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
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
