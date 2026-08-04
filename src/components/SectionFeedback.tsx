import type { FormData } from '../types';
import { useLang } from '../i18n/LanguageContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors?: Record<string, boolean>;
  honeypotRef?: React.Ref<HTMLInputElement>;
}

export default function SectionFeedback({ form, onChange, errors = {}, honeypotRef }: Props) {
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
        <div className="space-y-1.5">
          <label htmlFor="fb-suggestions" className="sr-only">
            {t('feedback.suggestions')}
          </label>
          <Textarea
            id="fb-suggestions"
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
      </div>

      <Separator className="my-2" />

      <div className="space-y-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-primary">{t('feedback.clientInfo')}</h3>
          <p className="text-xs text-muted-foreground">{t('feedback.clientInfoHint')}</p>
        </div>

        <fieldset className="space-y-2">
          <label htmlFor="fb-name" className="text-[15px] font-semibold text-foreground">
            {t('feedback.nameLabel')}
          </label>
          <Input
            id="fb-name"
            value={form.pangalan}
            onChange={(e) => onChange({ pangalan: e.target.value })}
            placeholder={t('feedback.namePlaceholder')}
            className="rounded-xl"
            maxLength={100}
          />
        </fieldset>

        <fieldset className="space-y-2" data-error-field="contactNumber">
          <label htmlFor="fb-contact" className="text-[15px] font-semibold text-foreground">
            {t('feedback.contactLabel')}
          </label>
          <Input
            id="fb-contact"
            value={form.contactNumber}
            onChange={(e) => onChange({ contactNumber: e.target.value })}
            placeholder={t('feedback.contactPlaceholder')}
            className={cn('rounded-xl', errors.contactNumber && 'border-destructive')}
            maxLength={20}
            inputMode="tel"
            aria-invalid={errors.contactNumber || undefined}
            aria-describedby={errors.contactNumber ? 'fb-contact-error' : undefined}
          />
          {errors.contactNumber && (
            <p id="fb-contact-error" role="alert" className="text-xs text-destructive pl-1">
              {t('validation.phone')}
            </p>
          )}
        </fieldset>

        <fieldset className="space-y-2" data-error-field="emailAddress">
          <label htmlFor="fb-email" className="text-[15px] font-semibold text-foreground">
            {t('feedback.emailLabel')}
          </label>
          <Input
            id="fb-email"
            type="email"
            value={form.emailAddress}
            onChange={(e) => onChange({ emailAddress: e.target.value })}
            placeholder={t('feedback.emailPlaceholder')}
            className={cn('rounded-xl', errors.emailAddress && 'border-destructive')}
            maxLength={200}
            inputMode="email"
            aria-invalid={errors.emailAddress || undefined}
            aria-describedby={errors.emailAddress ? 'fb-email-error' : undefined}
          />
          {errors.emailAddress && (
            <p id="fb-email-error" role="alert" className="text-xs text-destructive pl-1">
              {t('validation.email')}
            </p>
          )}
        </fieldset>
      </div>
    </div>
  );
}
