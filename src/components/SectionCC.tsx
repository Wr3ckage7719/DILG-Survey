import type { FormData } from '../types';
import StepCC from './StepCC';
import { useLang } from '../i18n/LanguageContext';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors?: Record<string, boolean>;
}

export default function SectionCC({ form, onChange, errors }: Props) {
  const { t } = useLang();
  return (
    <div className="space-y-8">
      <div className="space-y-2 rounded-2xl bg-muted/40 px-5 py-3.5">
        <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">{t('cc.bannerTitle')}</p>
        <p className="text-xs text-muted-foreground/80 italic leading-relaxed">
          {t('cc.bannerText')}
        </p>
      </div>
      <StepCC num={1} form={form} onChange={onChange} errors={errors} />
      <StepCC num={2} form={form} onChange={onChange} errors={errors} />
      <StepCC num={3} form={form} onChange={onChange} errors={errors} />
    </div>
  );
}
