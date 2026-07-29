import type { FormData } from '../types';
import StepCC from './StepCC';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionCC({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Gabay ng Mamamayan ng DILG</p>
        <p className="text-xs text-gray-500 italic">
          Panuto: Ang Gabay ng Mamamayan ay isang dokumento na nagpapakita ng mga serbisyo ng isang tanggapan
          ng pamahalaan at mga kaakibat nitong kahilingan, babayaran, at tagal ng pagpoproseso.
        </p>
      </div>

      <div className="space-y-8">
        <StepCC num={1} form={form} onChange={onChange} />
        <StepCC num={2} form={form} onChange={onChange} />
        <StepCC num={3} form={form} onChange={onChange} />
      </div>
    </div>
  );
}
