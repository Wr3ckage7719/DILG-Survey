import type { FormData } from '../types';
import StepSQD from './StepSQD';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionSQD({ form, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-muted/40 px-5 py-3.5">
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
