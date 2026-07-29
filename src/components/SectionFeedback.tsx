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
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Mga mungkahi</h3>
        <label className="block text-sm text-muted-foreground">
          Paano pa mapapabuti ang aming serbisyo?
        </label>
        <Textarea
          placeholder="Isulat ang inyong mungkahi..."
          value={form.mgaMungkahi}
          onChange={(e) => onChange({ mgaMungkahi: e.target.value })}
          className="min-h-[120px] rounded-xl resize-none"
        />
      </div>

      <Separator />

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Impormasyon ng Kliyente</h3>
        <p className="text-xs text-muted-foreground">Hindi required. Punan lamang kung nais mong makontak ka namin.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Pangalan (optional)</label>
        <Input
          value={form.pangalan}
          onChange={(e) => onChange({ pangalan: e.target.value })}
          placeholder="Pangalan"
          className="rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Contact number</label>
        <Input
          value={form.contactNumber}
          onChange={(e) => onChange({ contactNumber: e.target.value })}
          placeholder="Contact number"
          className="rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email address</label>
        <Input
          type="email"
          value={form.emailAddress}
          onChange={(e) => onChange({ emailAddress: e.target.value })}
          placeholder="Email address"
          className="rounded-xl"
        />
      </div>
    </div>
  );
}
