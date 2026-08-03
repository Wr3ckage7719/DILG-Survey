import type { FormData } from '../types';
import { useLang } from '../i18n/LanguageContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  honeypotRef?: React.Ref<HTMLInputElement>;
}

export default function SectionFeedback({ form, onChange, honeypotRef }: Props) {
  const { t } = useLang();
  return (
    <div className="space-y-7">
      {/* ─── Honeypot: invisible to humans, traps bots ─── */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] opacity-0 pointer-events-none" tabIndex={-1}>
        <label htmlFor="hp-website">Website</label>
        <input
          ref={honeypotRef}
          id="hp-website"
          name="website"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          defaultValue=""
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-bold text-primary">{t('feedback.suggestions')}</h3>
        <p className="text-[15px] text-muted-foreground">
          {t('feedback.suggestionsPrompt')}
        </p>
        <Textarea
          placeholder={t('feedback.suggestionsPlaceholder')}
          value={form.mgaMungkahi}
          onChange={(e) => onChange({ mgaMungkahi: e.target.value })}
          className="min-h-[140px] rounded-xl resize-none"
          maxLength={2000}
        />
        <p className="text-[10px] text-right text-muted-foreground">
          {form.mgaMungkahi.length}/2000
        </p>
      </div>

      <Separator className="my-2" />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-primary">{t('feedback.clientInfo')}</h3>
          <p className="text-xs text-muted-foreground">{t('feedback.clientInfoHint')}</p>
        </div>

        <fieldset className="space-y-2">
          <label className="text-[15px] font-semibold text-foreground">{t('feedback.nameLabel')}</label>
          <Input
            value={form.pangalan}
            onChange={(e) => onChange({ pangalan: e.target.value })}
            placeholder={t('feedback.namePlaceholder')}
            className="rounded-xl"
            maxLength={100}
          />
        </fieldset>
        <fieldset className="space-y-2">
          <label className="text-[15px] font-semibold text-foreground">{t('feedback.contactLabel')}</label>
          <Input
            value={form.contactNumber}
            onChange={(e) => onChange({ contactNumber: e.target.value })}
            placeholder={t('feedback.contactPlaceholder')}
            className="rounded-xl"
            maxLength={20}
            inputMode="tel"
          />
        </fieldset>
        <fieldset className="space-y-2">
          <label className="text-[15px] font-semibold text-foreground">{t('feedback.emailLabel')}</label>
          <Input
            type="email"
            value={form.emailAddress}
            onChange={(e) => onChange({ emailAddress: e.target.value })}
            placeholder={t('feedback.emailPlaceholder')}
            className="rounded-xl"
            maxLength={200}
            inputMode="email"
          />
        </fieldset>
      </div>
    </div>
  );
}
