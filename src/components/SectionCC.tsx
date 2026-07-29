import type { FormData } from '../types';
import StepCC from './StepCC';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionCC({ form, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Gabay ng Mamamayan ng DILG</p>
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          Panuto: Ang Gabay ng Mamamayan ay isang dokumento na nagpapakita ng mga serbisyo
          ng isang tanggapan ng pamahalaan at mga kaakibat nitong kahilingan, babayaran, at
          tagal ng pagpoproseso.
        </p>
      </div>
      <StepCC num={1} form={form} onChange={onChange} />
      <StepCC num={2} form={form} onChange={onChange} />
      <StepCC num={3} form={form} onChange={onChange} />
    </div>
  );
}
