import type { FormData } from '../types';
import StepSQD from './StepSQD';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionSQD({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <p className="text-xs text-gray-500 italic mb-6">
        Panuto: Lagyan ng tsek (✓) ang hanay na pinakaangkop sa iyong sagot.
      </p>

      <div className="space-y-6">
        {Array.from({ length: 9 }, (_, i) => (
          <StepSQD key={i} index={i} form={form} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
