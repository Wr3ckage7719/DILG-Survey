import type { FormData } from '../types';
import { SQD_LABELS, SQD_OPTIONS } from '../data/questions';

interface Props {
  index: number; // 0–8
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepSQD({ index, form, onChange }: Props) {
  const label = SQD_LABELS[index];
  const value = form.sqd[index];

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-800 mb-3">{label}</legend>
      <div className="space-y-1.5">
        {SQD_OPTIONS.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer border ${
              value === opt
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-100 hover:bg-blue-50'
            }`}
          >
            <input
              type="radio"
              name={`sqd${index}`}
              className="accent-blue-700"
              checked={value === opt}
              onChange={() => {
                const next = [...form.sqd];
                next[index] = opt;
                onChange({ sqd: next });
              }}
            />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
