import type { FormData } from '../types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionFeedback({ form, onChange }: Props) {
  return (
    <div className="space-y-7">
      <div className="space-y-3">
        <h3 className="text-base font-bold text-primary">Mga mungkahi</h3>
        <p className="text-sm text-muted-foreground">
          Paano pa mapapabuti ang aming serbisyo?
        </p>
        <Textarea
          placeholder="Isulat ang inyong mungkahi..."
          value={form.mgaMungkahi}
          onChange={(e) => onChange({ mgaMungkahi: e.target.value })}
          className="min-h-[130px] rounded-xl resize-none"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-primary">Impormasyon ng Kliyente</h3>
          <p className="text-xs text-muted-foreground">Hindi required. Punan lamang kung nais mong makontak ka namin.</p>
        </div>

        <fieldset className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Pangalan (optional)</label>
          <Input
            value={form.pangalan}
            onChange={(e) => onChange({ pangalan: e.target.value })}
            placeholder="Pangalan"
            className="rounded-xl"
          />
        </fieldset>
        <fieldset className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Contact number</label>
          <Input
            value={form.contactNumber}
            onChange={(e) => onChange({ contactNumber: e.target.value })}
            placeholder="Contact number"
            className="rounded-xl"
          />
        </fieldset>
        <fieldset className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Email address</label>
          <Input
            type="email"
            value={form.emailAddress}
            onChange={(e) => onChange({ emailAddress: e.target.value })}
            placeholder="Email address"
            className="rounded-xl"
          />
        </fieldset>
      </div>
    </div>
  );
}
