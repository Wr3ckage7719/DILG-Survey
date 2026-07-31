import type { FormData } from '../types';
import {
  OFFICES,
  SERVICE_GROUPS,
  KLIYENTE,
  EDAD,
  KASARIAN,
  CC1_OPTIONS,
  CC2_OPTIONS,
  CC3_OPTIONS,
  SQD_LABELS,
  SQD_OPTIONS,
} from '../data/questions';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  form: FormData;
}

const sectionLinks = [
  { id: 'office', label: 'Tanggapan' },
  { id: 'demographics', label: 'Demograpiko' },
  { id: 'cc', label: 'Gabay ng Mamamayan' },
  { id: 'sqd', label: 'Kalidad ng Serbisyo' },
  { id: 'feedback', label: 'Puná at Impormasyon' },
];

export default function StepReview({ form }: Props) {
  const allFilled = hasAllFilled(form);

  return (
    <div className="space-y-6">
      {allFilled ? (
        <p className="text-sm text-muted-foreground text-center">
          ✓ Napunan ang lahat ng kinakailangang bahagi.
        </p>
      ) : (
        <p className="text-sm text-amber-600 dark:text-amber-400 text-center font-medium">
          ⚠️ May mga bahagi na hindi pa napupunan. Pakibumalik at kumpunihin.
        </p>
      )}

      {/* Office */}
      <SectionSummary
        label="Tanggapan"
        fields={[
          { label: 'Pangalan ng tanggapan', value: OFFICES.includes(form.pangalanNgTanggapan) ? form.pangalanNgTanggapan : '' },
          { label: 'Serbisyong ibinigay', value: form.serbisyongIbinigay },
          ...(form.serbisyongIbinigay === 'Other/s (Tukuyin ang iba pang serbisyo)' && form.serbisyongIba
            ? [{ label: 'Iba pang serbisyo', value: form.serbisyongIba }]
            : []),
        ]}
        editSection="office"
      />

      {/* Demographics */}
      <SectionSummary
        label="Demograpiko"
        fields={[
          { label: 'Uri ng Kliyente', value: KLIYENTE.includes(form.uriNgKliyente) ? form.uriNgKliyente : '' },
          { label: 'Edad', value: EDAD.includes(form.edad) ? form.edad : '' },
          { label: 'Kasarian', value: KASARIAN.includes(form.kasarian) ? form.kasarian : '' },
          { label: 'Rehiyon', value: form.rehiyon },
        ]}
        editSection="demographics"
      />

      {/* CC */}
      <SectionSummary
        label="Gabay ng Mamamayan"
        fields={[
          { label: 'Kaalaman sa CC/Gabay', value: CC1_OPTIONS.includes(form.cc1) ? form.cc1 : '' },
          { label: 'Masasabi mo ba na ang Gabay ay', value: CC2_OPTIONS.includes(form.cc2) ? form.cc2 : '' },
          { label: 'Gaano nakatulong ang Gabay', value: CC3_OPTIONS.includes(form.cc3) ? form.cc3 : '' },
        ]}
        editSection="cc"
      />

      {/* SQD */}
      <SectionSummary
        label="Kalidad ng Serbisyo"
        fields={form.sqd.map((v, i) => ({
          label: SQD_LABELS[i]?.replace(/^\d+\.\s*/, '') ?? `SQD${i}`,
          value: SQD_OPTIONS.includes(v) ? v : '',
        }))}
        editSection="sqd"
      />

      {/* Feedback */}
      <SectionSummary
        label="Puná at Impormasyon"
        fields={[
          { label: 'Mga mungkahi', value: form.mgaMungkahi || '(walang isinulat)' },
          { label: 'Pangalan', value: form.pangalan || '(hindi ibinigay)' },
          { label: 'Contact number', value: form.contactNumber || '(hindi ibinigay)' },
          { label: 'Email', value: form.emailAddress || '(hindi ibinigay)' },
        ]}
        editSection="feedback"
      />
    </div>
  );
}

/* ─── sub-components ─── */

function SectionSummary({
  label,
  fields,
  editSection,
}: {
  label: string;
  fields: { label: string; value: string }[];
  editSection: string;
}) {
  const filledCount = fields.filter((f) => f.value && f.value !== '(walang isinulat)' && f.value !== '(hindi ibinigay)').length;
    return (
    <div className={cn(
      'rounded-2xl border px-5 py-4 space-y-2.5',
      filledCount === fields.length
        ? 'border-border/60 bg-card'
        : 'border-amber-200/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20',
    )}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
          {label}
        </p>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/60">
          {filledCount}/{fields.length}
          {filledCount === fields.length && (
            <Check className="h-3 w-3 text-accent" strokeWidth={3} />
          )}
        </span>
      </div>
      <div className="space-y-1.5">
        {fields.map((f) => (
          <div key={f.label} className="flex items-start gap-2 text-[15px]">
            <span className="text-muted-foreground/60 shrink-0 min-w-[7rem] text-xs">
              {f.label}:
            </span>
            <span className={cn(
              'text-foreground',
              (!f.value || f.value.startsWith('(')) && 'text-muted-foreground/40 italic',
            )}>
              {f.value || '✗'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── helpers ─── */

function hasAllFilled(form: FormData): boolean {
  const office = form.pangalanNgTanggapan && form.serbisyongIbinigay;
  const demo = form.uriNgKliyente && form.edad && form.kasarian && form.rehiyon;
  const cc = form.cc1 && form.cc2 && form.cc3;
  const sqd = form.sqd.every((v) => v);
  return !!(office && demo && cc && sqd);
}
