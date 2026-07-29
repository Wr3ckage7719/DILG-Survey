import type { FormData } from '../types';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepContact({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-sm font-bold text-blue-800 mb-2">Impormasyon ng Kliyente (Optional)</h2>
      <p className="text-xs text-gray-400 mb-4">Hindi required. Punan lamang kung nais mong makontak ka namin.</p>

      <InputBlock
        label="Pangalan (optional)"
        value={form.pangalan}
        onChange={(v) => onChange({ pangalan: v })}
      />
      <InputBlock
        label="Contact number"
        value={form.contactNumber}
        onChange={(v) => onChange({ contactNumber: v })}
      />
      <InputBlock
        label="Email address"
        value={form.emailAddress}
        onChange={(v) => onChange({ emailAddress: v })}
        type="email"
      />
    </div>
  );
}

function InputBlock(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{props.label}</label>
      <input
        type={props.type || 'text'}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}
