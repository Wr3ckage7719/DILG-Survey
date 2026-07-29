import type { FormData } from '../types';
import { OFFICES, SERVICES } from '../data/questions';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepOffice({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-sm font-bold text-blue-800 mb-4">1. Detalye ng Tanggapan</h2>

      <DropdownBlock
        label="Pangalan ng tanggapan / operating unit"
        value={form.pangalanNgTanggapan}
        options={OFFICES}
        onChange={(v) => onChange({ pangalanNgTanggapan: v })}
      />

      <DropdownBlock
        label="Serbisyong ibinigay"
        value={form.serbisyongIbinigay}
        options={SERVICES}
        onChange={(v) => onChange({ serbisyongIbinigay: v })}
      />

      {form.serbisyongIbinigay === 'Other/s (Tukuyin ang iba pang serbisyo)' && (
        <div className="mt-3 ml-2 pl-3 border-l-2 border-blue-300">
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Tukuyin ang iba pang serbisyo:
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Ilagay ang serbisyo..."
            value={form.serbisyongIba}
            onChange={(e) => onChange({ serbisyongIba: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

/* ─── shared dropdown block ─── */

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
        <ChevronDown />
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
