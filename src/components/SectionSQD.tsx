import type { FormData } from '../types';
import StepSQD from './StepSQD';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionSQD({ form, onChange }: Props) {
  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardContent className="p-6 space-y-6">
        <p className="text-sm text-muted-foreground italic">
          Panuto: Lagyan ng tsek (✓) ang hanay na pinakaangkop sa iyong sagot.
        </p>
        {Array.from({ length: 9 }, (_, i) => (
          <StepSQD key={i} index={i} form={form} onChange={onChange} />
        ))}
      </CardContent>
    </Card>
  );
}
