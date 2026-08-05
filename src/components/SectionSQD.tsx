import type { FormData } from '../types';
import StepSQD from './StepSQD';
import { useLang } from '../i18n/LanguageContext';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors?: Record<string, boolean>;
}

export default function SectionSQD({ form, onChange, errors = {} }: Props) {
  const { t } = useLang();
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-muted/40 px-5 py-3.5">
        <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{t('sqd.instructions')}</p>
        <p className="text-xs text-muted-foreground/80 italic">
          {t('sqd.instructionsText')}
        </p>
      </div>

      {Array.from({ length: 9 }, (_, i) => (
        <StepSQD key={i} index={i} form={form} onChange={onChange} error={errors[`sqd${i}`]} />
      ))}
    </div>
  );
}
