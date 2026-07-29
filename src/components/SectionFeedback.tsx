import type { FormData } from '../types';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function SectionFeedback({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Mga mungkahi</h3>
        <label className="block text-xs text-gray-500 mb-2">
          Paano pa mapapabuti ang aming serbisyo?
        </label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm h-32 resize-none"
          placeholder="Isulat ang inyong mungkahi..."
          value={form.mgaMungkahi}
          onChange={(e) => onChange({ mgaMungkahi: e.target.value })}
        />
      </div>

      <hr className="my-4" />

      <h3 className="text-sm font-semibold text-gray-800 mb-1">Impormasyon ng Kliyente</h3>
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
