import { useState, useCallback, useRef, useEffect } from 'react';
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
  warmUpSubmitEndpoint,
  delay,
  waitForRefSaved,
  type SubmitResult,
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

/** Maps a form field key to the localized "you missed this" message. */
const FIELD_ERROR_KEYS: Record<string, TranslationKey> = {
  pangalanNgTanggapan: 'office.selectOffice',
  serbisyongIbinigay: 'office.selectService',
  uriNgKliyente: 'demo.clientTypeErr',
  edad: 'demo.ageErr',
  kasarian: 'demo.sexErr',
  rehiyon: 'demo.regionErr',
  cc1: 'cc.select',
  cc2: 'cc.select',
  cc3: 'cc.select',
};

function validate(sectionId: string, form: FormData): string[] {
  const fields = REQUIRED_FIELDS[sectionId];
  if (!fields) return [];
  return fields.filter((key) => {
    const v = form[key];
    return !v || (typeof v === 'string' && v.trim() === '');
  });
}

/** SQD items that must be answered; index 5 (N/A preset) auto-passes. */
const SQD_REQUIRED_INDEXES = [0, 1, 2, 3, 4, 6, 7, 8];

function missingSqdIndexes(form: FormData): number[] {
  return SQD_REQUIRED_INDEXES.filter((i) => !form.sqd[i] || form.sqd[i].trim() === '');
}

function validateFeedbackSection(form: FormData): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  if (form.emailAddress && !validateEmail(form.emailAddress)) map.emailAddress = true;
  if (form.contactNumber && !validatePhone(form.contactNumber)) map.contactNumber = true;
  return map;
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
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [submitStage, setSubmitStage] = useState<'normal' | 'slow' | 'verySlow'>('normal');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const prefersReduced = useReducedMotion();

  const update = useCallback((patch: Partial<FormData>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((prev) => {
      const patchKey = Object.keys(patch)[0];
      if (!patchKey) return prev;
      // SQD items are keyed individually (sqd0..sqd8) — clear them all.
      if (patchKey === 'sqd') {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith('sqd')) delete next[k];
        }
        return next;
      }
      if (!prev[patchKey]) return prev;
      const next = { ...prev };
      delete next[patchKey];
      return next;
    });
  }, []);

  const sectionId = SECTIONS[sectionIdx];
  const total = SECTIONS.length;
  const isLast = sectionIdx === total - 1;

  // Warm the submit path (Vercel function + Apps Script) aggressively: on
  // mount (the user spends time on the landing/language screens), on every
  // step change, and on a 60s interval while the form is open. The server-side
  // keep-warm trigger is the primary guard against the ~27s Apps Script cold
  // start; this is the client-side belt-and-suspenders.
  useEffect(() => {
    if (submitted) return;
    warmUpSubmitEndpoint();
    const id = setInterval(warmUpSubmitEndpoint, 60_000);
    return () => clearInterval(id);
  }, [submitted]);

  useEffect(() => {
    warmUpSubmitEndpoint();
  }, [sectionId]);

  const scrollToFirstError = (keys: string[]) => {
    const firstKey = keys[0];
    const el = document.querySelector(`[data-error-field="${firstKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const showSqdErrors = (missing: number[]) => {
    const errorMap: Record<string, boolean> = { sqd: true };
    missing.forEach((i) => { errorMap[`sqd${i}`] = true; });
    setErrors(errorMap);
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    scrollToFirstError(missing.map((i) => `sqd${i}`));
    toast.error(t('sqd.error'));
  };

  const showFieldErrors = (errorKeys: string[]) => {
    const errorMap: Record<string, boolean> = {};
    errorKeys.forEach((key) => { errorMap[key] = true; });
    setErrors(errorMap);
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    scrollToFirstError(errorKeys);
    const msgs = errorKeys
      .map((k) => FIELD_ERROR_KEYS[k])
      .filter((k): k is TranslationKey => Boolean(k));
    const msg = [...new Set(msgs)].map((k) => t(k)).join(' · ');
    if (msg) toast.error(msg);
  };

  const next = () => {
    const errorKeys = validate(sectionId, form);
    if (errorKeys.length > 0) {
      showFieldErrors(errorKeys);
      return;
    }
    // SQD: every item except the N/A preset must be answered before advancing
    if (sectionId === 'sqd') {
      const missing = missingSqdIndexes(form);
      if (missing.length > 0) {
        showSqdErrors(missing);
        return;
      }
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
      showFieldErrors(errorKeys);
      return;
    }

    // SQD: every item except the N/A preset must be answered — checked here
    // unconditionally (not gated by sectionId), because the submit button lives
    // on the feedback section and a previous bug let empty SQD strings through
    // to the server, which rejects them with invalid_sqd (400).
    if (sectionId === 'sqd' || isLast) {
      const missing = missingSqdIndexes(form);
      if (missing.length > 0) {
        showSqdErrors(missing);
        return;
      }
    }

    // Validate email/phone format — inline errors + toast instead of a silent dead-end
    const feedbackErrors = validateFeedbackSection(form);
    if (Object.keys(feedbackErrors).length > 0) {
      setErrors(feedbackErrors);
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
      scrollToFirstError(Object.keys(feedbackErrors));
      const msg = [
        feedbackErrors.emailAddress ? t('validation.email') : '',
        feedbackErrors.contactNumber ? t('validation.phone') : '',
      ].filter(Boolean).join(' · ');
      toast.error(msg);
      return;
    }

    // Honeypot check — reject silently if bot-filled
    if (honeypotRef.current && isHoneypotFilled(honeypotRef.current.value)) {
      toast.success(t('toast.submitted'));
      setSubmitted(true);
      return;
    }

    setErrors({});

    // Guard against double-submits from fast taps
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitStage('normal');

    // Generate reference number (reused by the retry — the Apps Script dedupes
    // by it, so retrying after a lost response can never create a duplicate).
    const ref = generateRefNumber();

    // Progress messaging: reassure the client while they wait. Thresholds are
    // generous — the fast-success ref-watch below typically confirms within
    // ~5-9s, under the slow threshold, so the happy path shows no warning.
    const slowTimer = setTimeout(() => setSubmitStage('slow'), 10_000);
    const verySlowTimer = setTimeout(() => setSubmitStage('verySlow'), 30_000);
    const abortRefWatch = new AbortController();

    try {
      // Fast-success watcher: polls the ?ref= lookup until the row actually
      // lands in the spreadsheet — the true "saved" signal — so the success
      // screen appears the moment the data is recorded, without waiting for the
      // slow POST round-trip (which can exceed 40s when Google's edge loses the
      // response after a cold start). Read-only GET through the Vercel proxy;
      // the Apps Script URL never touches the browser.
      const REF_WATCH_BUDGET_MS = 50_000;
      const submitStartedAt = Date.now();
      const refWatchDone = waitForRefSaved(ref, { timeoutMs: REF_WATCH_BUDGET_MS }, abortRefWatch.signal);

      let settled = false;
      const finishSuccess = () => {
        if (settled) return;
        settled = true;
        abortRefWatch.abort();
        setSubmitted(true);
        toast.success(t('toast.submitted'));
      };
      const finishFailure = (result: SubmitResult) => {
        if (settled) return;
        settled = true;
        abortRefWatch.abort();
        navigator.vibrate?.([120, 60, 120]);
        toast.error(result.error || t('toast.failed'));
      };

      // Fast path: the moment the row appears in the sheet, show success.
      refWatchDone.then((saved) => {
        if (saved) finishSuccess();
      });

      // Main path: the POST flow (single auto-retry with the SAME refNumber as
      // before — the Apps Script dedupes by it, so a retry can never create a
      // duplicate row). If the ref-watch already confirmed, skip the retry.
      const postOutcome = await (async (): Promise<SubmitResult> => {
        try {
          let result = await submitSurvey(form, ref, lang);

          // Retry reasons (unchanged): submit_failed → 2s; fetch_error (client
          // timeout) → longer wait for a cold instance to warm; rate_limit → a
          // recent success for this IP means the row may already exist, so wait
          // out the server cooldown then let the dedupe confirm it.
          if (!result.ok) {
            const waitMs =
              result.code === 'rate_limit' ? 16_000
              : result.code === 'fetch_error' ? 25_000
              : 2_000;
            await delay(waitMs, abortRefWatch.signal);
            // Success may already be showing via the ref-watch — no retry needed.
            if (settled) return { ok: true, refNumber: ref };
            result = await submitSurvey(form, ref, lang, { isRetry: true });
          }

          // A rate_limit on the RETRY means a save from this IP succeeded within
          // the cooldown window. Since this retry reuses our own refNumber, that
          // save is our row — the dedupe guarantees it — so treat it as success.
          if (!result.ok && result.code === 'rate_limit') {
            result = { ok: true, refNumber: ref };
          }
          return result;
        } catch {
          return { ok: false, refNumber: ref, error: t('toast.failed'), code: 'fetch_error' };
        }
      })();

      if (!settled) {
        if (postOutcome.ok) {
          finishSuccess();
        } else {
          // The POST failed, but the row may still be saved (lost response after
          // a cold start, or Google's edge returned an error AFTER writing). Give
          // the ref-watch a grace window before declaring failure so a recorded
          // survey is never shown as an error. fetch_error gets the full budget
          // (the write can land late); definitive rejections get a short window.
          const elapsed = Date.now() - submitStartedAt;
          const remainingBudget = Math.max(0, REF_WATCH_BUDGET_MS - elapsed);
          const graceMs = Math.min(
            postOutcome.code === 'fetch_error' ? remainingBudget : 8_000,
            remainingBudget,
          );
          const saved = await Promise.race([
            refWatchDone,
            delay(graceMs).then(() => false),
          ]);
          if (saved) finishSuccess();
          else finishFailure(postOutcome);
        }
      }
    } finally {
      clearTimeout(slowTimer);
      clearTimeout(verySlowTimer);
      abortRefWatch.abort();
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const renderSection = () => {
    switch (sectionId) {
      case 'office': return <StepOffice form={form} onChange={update} errors={errors} />;
      case 'demographics': return <StepDemographics form={form} onChange={update} errors={errors} />;
      case 'cc': return <SectionCC form={form} onChange={update} errors={errors} />;
      case 'sqd': return <SectionSQD form={form} onChange={update} errors={errors} />;
      case 'feedback': return (
        <SectionFeedback
          form={form}
          onChange={update}
          errors={errors}
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
            <p className="text-xs text-muted-foreground">FM-SP-DILG-07-07</p>

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
                  Please read the Data Privacy Notice and give your consent.
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
                I have read the Data Privacy Notice and I give my consent.
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
              CONTINUE
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
                Consent is required before proceeding.
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
              src="/logo-3.png"
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
        <div className="max-w-xl mx-auto p-4">
          {/* Progress messaging: only appears when the submit is taking long */}
          <AnimatePresence>
            {submitting && submitStage !== 'normal' && (
              <motion.p
                key={submitStage}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-center text-muted-foreground mb-2 px-4"
              >
                {submitStage === 'verySlow'
                  ? t('nav.submittingVerySlow')
                  : t('nav.submittingSlow')}
              </motion.p>
            )}
          </AnimatePresence>
          <div className="flex gap-3 items-center">
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
      </div>

      <Toaster position="top-center" />
    </div>
    </>
  );
}
