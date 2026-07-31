import type { FormData } from '../types';
import StepCC from './StepCC';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors?: Record<string, boolean>;
}

export default function SectionCC({ form, onChange, errors }: Props) {
  return (
    <div className="space-y-8">
      <div className="space-y-2 rounded-2xl border-l-2 border-l-accent/60 bg-muted/40 px-5 py-3.5">
        <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Gabay ng Mamamayan ng DILG</p>
        <p className="text-xs text-muted-foreground/80 italic leading-relaxed">
          Panuto: Ang Gabay ng Mamamayan ay isang dokumento na nagpapakita ng mga serbisyo
          ng isang tanggapan ng pamahalaan at mga kaakibat nitong kahilingan, babayaran, at
          tagal ng pagpoproseso.
        </p>
      </div>
      <StepCC num={1} form={form} onChange={onChange} errors={errors} />
      <StepCC num={2} form={form} onChange={onChange} errors={errors} />
      <StepCC num={3} form={form} onChange={onChange} errors={errors} />
    </div>
  );
}
