import type { FormData } from '../types';
import StepCC from './StepCC';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionCC({ form, onChange }: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 rounded-xl bg-muted/50 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Gabay ng Mamamayan ng DILG</p>
        <p className="text-xs text-muted-foreground/80 italic leading-relaxed">
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
