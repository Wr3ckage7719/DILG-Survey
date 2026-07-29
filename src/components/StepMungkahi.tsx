import type { FormData } from '../types';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export default function StepMungkahi({ form, onChange }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-sm font-bold text-blue-800 mb-4">5. Puná / Mungkahi</h2>

      <label className="block text-xs font-semibold text-gray-600 mb-2">
        Mga mungkahi sa kung paano pa mapapabuti ang aming serbisyo:
      </label>
      <textarea
        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm h-36 resize-none"
        placeholder="Isulat ang inyong mungkahi..."
        value={form.mgaMungkahi}
        onChange={(e) => onChange({ mgaMungkahi: e.target.value })}
      />
    </div>
  );
}
