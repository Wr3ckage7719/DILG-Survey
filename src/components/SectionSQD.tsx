import type { FormData } from '../types';
import StepSQD from './StepSQD';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionSQD({ form, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border-l-2 border-l-gold bg-muted/50 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Panuto</p>
        <p className="text-xs text-muted-foreground/80 italic">
          Lagyan ng tsek (&#10003;) ang hanay na pinakaangkop sa iyong sagot.
        </p>
      </div>
      {Array.from({ length: 9 }, (_, i) => (
        <StepSQD key={i} index={i} form={form} onChange={onChange} />
      ))}
    </div>
  );
}
