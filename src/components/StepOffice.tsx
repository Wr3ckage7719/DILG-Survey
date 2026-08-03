import type { FormData } from '../types';
import { Fragment } from 'react';
import { OFFICES, SERVICES, SERVICE_GROUPS, canonicalOf, localizedOf } from '../data/questions';
import { useLang } from '../i18n/LanguageContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  form: FormData;
  onChange: (patch: Partial<FormData>) => void;
  errors: Record<string, boolean>;
}

export default function StepOffice({ form, onChange, errors }: Props) {
  const { lang, t } = useLang();

  return (
    <div className="space-y-7">
      <fieldset className="space-y-2" data-error-field="pangalanNgTanggapan">
        <label className="text-[15px] font-semibold text-foreground">
          {t('office.name')}
          <RequiredIcon />
        </label>
        <RadioGroup
          value={form.pangalanNgTanggapan}
          onValueChange={(v) => onChange({ pangalanNgTanggapan: v })}
          className="grid gap-2"
        >
          {OFFICES.map((o) => (
            <label
              key={o}
              className={cn(
                'flex cursor-pointer items-center gap-3.5 rounded-2xl border px-5 py-3.5 text-[15px] transition-colors duration-200',
                form.pangalanNgTanggapan === o
                  ? 'border-accent/20 bg-accent/[0.04] font-semibold text-accent'
                  : 'border-border/80 bg-card hover:bg-accent/5 hover:border-border',
              )}
            >
              <RadioGroupItem value={o} id={`office-${o}`} className="shrink-0" />
              <span className="leading-tight">{o}</span>
            </label>
          ))}
        </RadioGroup>
        {errors.pangalanNgTanggapan && (
          <p className="text-xs text-destructive/70 pl-1">{t('office.selectOffice')}</p>
        )}
      </fieldset>

      <fieldset className="space-y-2" data-error-field="serbisyongIbinigay">
        <label className="text-[15px] font-semibold text-foreground">
          {t('office.service')}
          <RequiredIcon />
        </label>
        <Select
          value={localizedOf(SERVICES, lang, form.serbisyongIbinigay)}
          onValueChange={(v) => onChange({ serbisyongIbinigay: canonicalOf(SERVICES, lang, v) })}
        >
          <SelectTrigger className="w-full rounded-xl">
            <SelectValue placeholder={t('common.placeholder')} />
          </SelectTrigger>
          <SelectContent side="top">
            {SERVICE_GROUPS[lang].map((group, gi) => (
              <Fragment key={gi}>
                {gi > 0 && <SelectSeparator />}
                <SelectGroup>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.items.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectGroup>
              </Fragment>
            ))}
          </SelectContent>
        </Select>
        {errors.serbisyongIbinigay && (
          <p className="text-xs text-destructive/70 pl-1">{t('office.selectService')}</p>
        )}
      </fieldset>

      {form.serbisyongIbinigay === 'Other/s (Tukuyin ang iba pang serbisyo)' && (
        <div className="ml-2 pl-4 border-l-2 border-accent/20">
          <label className="block text-[15px] font-medium text-foreground mb-1.5">
            {t('office.other')}
          </label>
          <Input
            placeholder={t('office.otherPlaceholder')}
            value={form.serbisyongIba}
            onChange={(e) => onChange({ serbisyongIba: e.target.value })}
            className="rounded-xl"
          />
        </div>
      )}
    </div>
  );
}

function RequiredIcon() {
  return (
    <span className="ml-1 text-destructive text-sm font-bold leading-none" aria-label="required">*</span>
  );
}
