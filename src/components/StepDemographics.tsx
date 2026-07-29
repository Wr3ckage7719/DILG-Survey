import type { FormData } from '../types';
import { KLIYENTE, EDAD, KASARIAN, REGIONS } from '../data/questions';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepDemographics({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-sm font-bold text-blue-800 mb-4">2. Demograpiko</h2>

      <RadioGroup
        label="Uri ng Kliyente"
        options={KLIYENTE}
        value={form.uriNgKliyente}
        onChange={(v) => onChange({ uriNgKliyente: v })}
      />

      <RadioGroup
        label="Edad"
        options={EDAD}
        value={form.edad}
        onChange={(v) => onChange({ edad: v })}
      />

      <RadioGroup
        label="Kasarian"
        options={KASARIAN}
        value={form.kasarian}
        onChange={(v) => onChange({ kasarian: v })}
      />

      <DropdownBlock
        label="Rehiyon ng tirahan"
        value={form.rehiyon}
        options={REGIONS}
        onChange={(v) => onChange({ rehiyon: v })}
      />
    </div>
  );
}

/* ─── radio group ─── */

function RadioGroup(props: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="block text-xs font-semibold text-gray-600 mb-2">{props.label}</legend>
      <div className="space-y-1.5">
        {props.options.map((o) => (
          <label key={o} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-blue-50 cursor-pointer">
            <input
              type="radio"
              name={props.label}
              className="accent-blue-700"
              checked={props.value === o}
              onChange={() => props.onChange(o)}
            />
            <span className="text-sm">{o}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ─── shared dropdown ─── */

function DropdownBlock(props: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{props.label}</label>
      <div className="relative">
        <select
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none bg-white"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        >
          <option value="">— Pumili —</option>
          {props.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <svg className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
