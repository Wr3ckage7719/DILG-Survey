import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowRight, ChevronDown, ChevronLeft } from 'lucide-react';

import { type FormData, SECTIONS, SECTION_LABELS, INITIAL_FORM, type Language } from './types';
import { DISCLAIMER } from './data/questions';
import {
  submitSurvey,
  generateRefNumber,
  isHoneypotFilled,
  validateEmail,
  validatePhone,
} from './api/submit';
import { LanguageProvider, useLang } from './i18n/LanguageContext';
import type { TranslationKey } from './i18n/translations';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

import { DotLottiePlayer } from '@dotlottie/react-player';
import StepOffice from './components/StepOffice';
import StepDemographics from './components/StepDemographics';
import SectionCC from './components/SectionCC';
import SectionSQD from './components/SectionSQD';
import SectionFeedback from './components/SectionFeedback';
import StepIndicator from './components/StepIndicator';
import LanguagePicker from './components/LanguagePicker';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

const MotionButton = motion.create(Button);
const slideArrowVariants = {
  rest:  { opacity: 0, width: 0, x: -6 },
  hover: { opacity: 1, width: 20, x: 0 },
};

/** Render text with certain phrases wrapped in <strong> */
function renderBoldText(text: string, boldPhrases: string[]) {
  if (!boldPhrases.length) return text;
  const pattern = new RegExp(`(${boldPhrases.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    boldPhrases.includes(part) ? <strong key={i}>{part}</strong> : part
  );
}

const REQUIRED_FIELDS: Record<string, (keyof FormData)[]> = {
  office: ['pangalanNgTanggapan', 'serbisyongIbinigay'],
  demographics: ['uriNgKliyente', 'edad', 'kasarian', 'rehiyon'],
  cc: ['cc1', 'cc2', 'cc3'],
  sqd: [],
  feedback: [],
};

function validate(sectionId: string, form: FormData): string[] {
  const fields = REQUIRED_FIELDS[sectionId];
  if (!fields) return [];
  return fields.filter((key) => {
    const v = form[key];
    return !v || (typeof v === 'string' && v.trim() === '');
  });
}

function validateFeedbackSection(form: FormData, t: (key: TranslationKey) => string): string | null {
  if (form.emailAddress && !validateEmail(form.emailAddress)) {
    return t('validation.email');
  }
  if (form.contactNumber && !validatePhone(form.contactNumber)) {
    return t('validation.phone');
  }
  return null;
}

type Screen = 'landing' | 'language' | 'form';

export default function App() {
  return (
    <LanguageProvider>
      <Survey />
    </LanguageProvider>
  );
}

function Survey() {
  const { lang, setLang, t } = useLang();
  const [screen, setScreen] = useState<Screen>('landing');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [shaking, setShaking] = useState(false);
  const [refNumber, setRefNumber] = useState<string>('');
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();

  const update = useCallback((patch: Partial<FormData>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((prev) => {
      const patchKey = Object.keys(patch)[0];
      if (!patchKey || !prev[patchKey]) return prev;
      const next = { ...prev };
      delete next[patchKey];
      return next;
    });
  }, []);

  const sectionId = SECTIONS[sectionIdx];
  const total = SECTIONS.length;
  const isLast = sectionIdx === total - 1;

  const scrollToFirstError = (keys: string[]) => {
    const firstKey = keys[0];
    const el = document.querySelector(`[data-error-field="${firstKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const next = () => {
    const errorKeys = validate(sectionId, form);
    if (errorKeys.length > 0) {
      const errorMap: Record<string, boolean> = {};
      errorKeys.forEach((key) => { errorMap[key] = true; });
      setErrors(errorMap);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      scrollToFirstError(errorKeys);
      return;
    }
    setErrors({});
    setSectionIdx((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const prev = () => {
    setSectionIdx((s) => s - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    // Validate required fields
    const errorKeys = validate(sectionId, form);
    if (errorKeys.length > 0) {
      const errorMap: Record<string, boolean> = {};
      errorKeys.forEach((key) => { errorMap[key] = true; });
      setErrors(errorMap);
      scrollToFirstError(errorKeys);
      return;
    }

    // Validate email/phone format
    const feedbackErr = validateFeedbackSection(form, t);
    if (feedbackErr) {
      return;
    }

    // Honeypot check — reject silently if bot-filled
    if (honeypotRef.current && isHoneypotFilled(honeypotRef.current.value)) {
      toast.success(t('toast.submitted'));
      setSubmitted(true);
      return;
    }

    setErrors({});
    setSubmitting(true);

    // Generate reference number for audit trail
    const ref = generateRefNumber();
    setRefNumber(ref);

    const result = await submitSurvey(form, ref, lang);
    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
      toast.success(t('toast.submitted'));
    } else {
      navigator.vibrate?.([120, 60, 120]);
      toast.error(result.error || t('toast.failed'));
    }
  };

  const renderSection = () => {
    switch (sectionId) {
      case 'office': return <StepOffice form={form} onChange={update} errors={errors} />;
      case 'demographics': return <StepDemographics form={form} onChange={update} errors={errors} />;
      case 'cc': return <SectionCC form={form} onChange={update} errors={errors} />;
      case 'sqd': return <SectionSQD form={form} onChange={update} />;
      case 'feedback': return (
        <SectionFeedback
          form={form}
          onChange={update}
          honeypotRef={honeypotRef}
        />
      );
    }
  };

  if (screen === 'landing') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-5 bg-white">
          <div className="max-w-lg w-full space-y-5 text-center">
            {/* Logo - Stacked layout */}
            <img
              src="/logo.png"
              alt="DILG Logo"
              className="h-24 mx-auto object-contain"
            />

            {/* Form code */}
            <p className="text-xs text-muted-foreground">FM-SP-DILG-07-07B</p>

            {/* Title */}
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              CLIENT SATISFACTION SURVEY (ON-SITE)
            </h1>

            {/* Animation GIF */}
            <img
              src="/animation-gif.gif"
              alt="Animation"
              className="w-full max-w-[280px] mx-auto rounded-xl"
            />

            {/* Privacy consent dropdown */}
            <div className="border border-border rounded-lg overflow-hidden text-left">
              <button
                type="button"
                onClick={() => setPrivacyExpanded(!privacyExpanded)}
                className="w-full flex items-center justify-between p-4 gap-3 hover:bg-secondary/50 transition-colors"
              >
                <span className="text-sm text-foreground">
                  Pakibasa ang Data Privacy Notice at ibigay ang iyong pahintulot.
                </span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 shrink-0 text-foreground transition-transform duration-200",
                    privacyExpanded && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {privacyExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 border-t border-border pt-4">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1 mb-3">
                        <span className="size-1.5 rounded-full bg-primary" />
                        {DISCLAIMER.title}
                      </p>
                      <p className="text-base text-foreground leading-loose">
                        {renderBoldText(DISCLAIMER.text, DISCLAIMER.boldPhrases)}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Consent checkbox */}
            <label className="flex items-center gap-3 cursor-pointer text-left">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="size-4 shrink-0 accent-primary rounded"
              />
              <span className="text-sm text-muted-foreground leading-relaxed select-none">
                Nabasa ko na ang Data Privacy Notice at nagbibigay ako ng aking pahintulot.
              </span>
            </label>

            {/* Submit button */}
            <MotionButton
              onClick={() => setScreen('language')}
              size="lg"
              disabled={!consentChecked}
              initial="rest"
              whileHover="hover"
              className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-base"
            >
              MAGPATULOY
              <motion.span
                variants={slideArrowVariants}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden flex items-center"
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
              </motion.span>
            </MotionButton>
            {!consentChecked && (
              <p className="text-xs text-muted-foreground/70">
                Kailangan munang magbigay ng pahintulot bago magpatuloy.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  if (screen === 'language') {
    return (
      <LanguagePicker
        onSelect={(l: Language) => {
          setLang(l);
          setScreen('form');
        }}
        onBack={() => setScreen('landing')}
      />
    );
  }

  if (submitted) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-5 bg-survey">
        <Card className="max-w-lg w-full rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_6px_-1px_rgba(0,25,70,0.12),0_6px_18px_-4px_rgba(0,25,70,0.08)]">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-40 h-40 rounded-full ring-4 ring-accent/20 p-2">
              <DotLottiePlayer
                src="/Trophy.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <h2 className="text-xl font-bold text-primary">{t('done.title')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('done.message')}
            </p>
            {refNumber && (
              <div className="mt-4 rounded-xl bg-muted/50 border border-border px-4 py-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  {t('done.refLabel')}
                </p>
                <p className="text-sm font-mono font-bold text-primary select-all">
                  {refNumber}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t('done.refHint')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col bg-survey">

      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-[3px] z-50 bg-accent"
        animate={{ width: `${((sectionIdx + 1) / total) * 100}%` }}
        transition={spring}
      />

      <div className="flex-1 flex items-start justify-center p-5 pt-5 pb-32">
        <div className="max-w-xl w-full">

          {/* DILG header */}
          <div className="flex items-center justify-center mt-5 mb-7">
            <img
              src="/logo-2.png"
              alt="DILG Logo"
              className="h-12 object-contain"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={sectionId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <StepIndicator currentIndex={sectionIdx} total={total} />

              <Card className={cn(
                "rounded-3xl border border-black/[0.06] bg-white border-t-2 border-t-primary/20 shadow-[0_1px_6px_-1px_rgba(0,25,70,0.12),0_6px_18px_-4px_rgba(0,25,70,0.08)]",
                shaking && "animate-shake"
              )}>
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-base font-bold text-primary mb-8">
                    {SECTION_LABELS[lang][sectionId]}
                  </h2>
                  {renderSection()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-border/40">
        <div className="max-w-xl mx-auto p-4 flex gap-3 items-center">
          {sectionIdx > 0 && (
            <Button variant="outline" onClick={prev} className="flex-1">
              <ChevronLeft className="w-4 h-4" />
              {t('nav.back')}
            </Button>
          )}
          {!isLast ? (
            <MotionButton
              onClick={next}
              initial="rest"
              whileHover="hover"
              className="flex-1"
            >
              {t('nav.next')}
              <motion.span
                variants={slideArrowVariants}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden flex items-center"
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
              </motion.span>
            </MotionButton>
          ) : (
            <MotionButton
              variant="accent"
              onClick={handleSubmit}
              disabled={submitting}
              initial="rest"
              whileHover="hover"
              className="flex-1"
            >
              {submitting ? t('nav.submitting') : t('nav.submit')}
              <motion.span
                variants={slideArrowVariants}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden flex items-center"
              >
                <ArrowRight className="w-4 h-4 shrink-0" />
              </motion.span>
            </MotionButton>
          )}
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
    </>
  );
}
