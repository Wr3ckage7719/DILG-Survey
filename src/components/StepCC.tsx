import type { FormData } from '../types';
import { CC1_OPTIONS, CC2_OPTIONS, CC3_OPTIONS } from '../data/questions';

interface Props {
  num: 1 | 2 | 3;
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

const CC_TITLES: Record<number, string> = {
  1: 'CC1. Alin sa mga sumusunod ang naglalarawan ng iyong kaalaman sa CC/Gabay?',
  2: 'CC2. Kung alam ang Gabay, masasabi mo ba na ang Gabay ng tanggapang ito ay:',
  3: 'CC3. Kung alam ang Gabay, gaano nakatulong ang Gabay sa iyong transaksiyon?',
};

const CC_OPTIONS: Record<number, string[]> = { 1: CC1_OPTIONS, 2: CC2_OPTIONS, 3: CC3_OPTIONS };
const CC_KEYS = ['cc1', 'cc2', 'cc3'] as const;

export default function StepCC({ num, form, onChange }: Props) {
  const key = CC_KEYS[num - 1];
  const options = CC_OPTIONS[num];
  const title = CC_TITLES[num];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-4">
        <p className="text-xs text-gray-400 mb-1">Gabay ng Mamamayan ng DILG</p>
        {num === 1 && (
          <p className="text-xs text-gray-500 italic mb-3">
            Panuto: Ang Gabay ng Mamamayan ay isang dokumento na nagpapakita ng mga serbisyo ng isang tanggapan
            ng pamahalaan at mga kaakibat nitong kahilingan, babayaran, at tagal ng pagpoproseso.
          </p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-3">{title}</legend>
        <div className="space-y-2">
          {options.map((o, i) => (
            <label
              key={i}
              className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-blue-50 cursor-pointer border border-gray-100"
            >
              <input
                type="radio"
                name={key}
                className="accent-blue-700 mt-0.5"
                checked={form[key] === o}
                onChange={() => onChange({ [key]: o } as Partial<FormData>)}
              />
              <span className="text-sm">{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
