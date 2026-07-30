import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { type FormData, SECTIONS, SECTION_LABELS, INITIAL_FORM } from './types';
import { DISCLAIMER } from './data/questions';
import {
  submitSurvey,
  generateRefNumber,
  isHoneypotFilled,
  validateEmail,
  validatePhone,
} from './api/submit';
import { vibrateError, playErrorSound, scrollToError } from './lib/feedback';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

import { DotLottiePlayer } from '@dotlottie/react-player';
import LogoSrc from './Logo.png';
import StepOffice from './components/StepOffice';
import StepDemographics from './components/StepDemographics';
import SectionCC from './components/SectionCC';
import SectionSQD from './components/SectionSQD';
import SectionFeedback from './components/SectionFeedback';
import StepIndicator from './components/StepIndicator';
import StepReview from './components/StepReview';

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 };

const REQUIRED_FIELDS: Record<string, (keyof FormData)[]> = {
  office: ['pangalanNgTanggapan', 'serbisyongIbinigay'],
  demographics: ['uriNgKliyente', 'edad', 'kasarian', 'rehiyon'],
  cc: ['cc1', 'cc2', 'cc3'],
  sqd: [],
  feedback: [],
  review: [],
};

function validate(sectionId: string, form: FormData): { message: string; key: string } | null {
  const fields = REQUIRED_FIELDS[sectionId];
  if (!fields) return null;
  for (const key of fields) {
    const v = form[key];
    if (!v || (typeof v === 'string' && v.trim() === '')) {
      const labels: Record<string, string> = {
        pangalanNgTanggapan: 'Pangalan ng tanggapan',
        serbisyongIbinigay: 'Serbisyong ibinigay',
        uriNgKliyente: 'Uri ng Kliyente',
        edad: 'Edad',
        kasarian: 'Kasarian',
        rehiyon: 'Rehiyon',
        cc1: 'CC1',
        cc2: 'CC2',
        cc3: 'CC3',
      };
      return { message: `Punan ang ${labels[key] || key}`, key };
    }
  }
  return null;
}

function validateFeedbackSection(form: FormData): string | null {
  if (form.emailAddress && !validateEmail(form.emailAddress)) {
    return 'Hindi valid ang email address.';
  }
  if (form.contactNumber && !validatePhone(form.contactNumber)) {
    return 'Hindi valid ang contact number.';
  }
  return null;
}

export default function App() {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [consentChecked, setConsentChecked] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [sectionError, setSectionError] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [refNumber, setRefNumber] = useState<string>('');
  const honeypotRef = useRef<HTMLInputElement>(null);
  const prefersReduced = useReducedMotion();

  const update = useCallback((patch: Partial<FormData>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSectionError('');
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

  const next = () => {
    const err = validate(sectionId, form);
    if (err) {
      setErrors({ [err.key]: true });
      setSectionError(err.message);
      vibrateError();
      playErrorSound();
      scrollToError(err.key);
      toast.error(err.message, {
        className: '!bg-amber-100 !text-amber-900 !border-amber-200 dark:!bg-amber-950/80 dark:!text-amber-200 dark:!border-amber-800',
      });
      return;
    }
    setErrors({});
    setSectionError('');
    setSectionIdx((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const prev = () => {
    setSectionIdx((s) => s - 1);
    window.scrollTo(0, 0);
  };

  const confirmSubmit = () => {
    if (sectionId === 'review') {
      setShowConfirm(true);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const err = validate(sectionId, form);
    if (err) {
      setErrors({ [err.key]: true });
      setSectionError(err.message);
      vibrateError();
      playErrorSound();
      scrollToError(err.key);
      toast.error(err.message, {
        className: '!bg-amber-100 !text-amber-900 !border-amber-200 dark:!bg-amber-950/80 dark:!text-amber-200 dark:!border-amber-800',
      });
      return;
    }

    // Validate email/phone format
    const feedbackErr = validateFeedbackSection(form);
    if (feedbackErr) {
      setSectionError(feedbackErr);
      toast.error(feedbackErr, {
        className: '!bg-amber-100 !text-amber-900 !border-amber-200 dark:!bg-amber-950/80 dark:!text-amber-200 dark:!border-amber-800',
      });
      return;
    }

    // Honeypot check — reject silently if bot-filled
    if (honeypotRef.current && isHoneypotFilled(honeypotRef.current.value)) {
      toast.success('Naipadala ang inyong sarbey!');
      setSubmitted(true);
      return;
    }

    setErrors({});
    setSectionError('');
    setShowConfirm(false);
    setSubmitting(true);

    // Generate reference number for audit trail
    const ref = generateRefNumber();
    setRefNumber(ref);

    const result = await submitSurvey(form, ref);
    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
      toast.success('Naipadala ang inyong sarbey!');
    } else {
      toast.error(result.error || 'Hindi nakapag-submit. Pakisubukan muli.', {
        className: '!bg-amber-100 !text-amber-900 !border-amber-200 dark:!bg-amber-950/80 dark:!text-amber-200 dark:!border-amber-800',
      });
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
      case 'review': return (
        <StepReview form={form} />
      );
    }
  };

  if (showDisclaimer) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-survey">
        <Card className="max-w-lg w-full rounded-2xl shadow-sm border border-t-2 border-t-primary">
          <CardContent className="p-8 text-center space-y-5">
            <img
              src={LogoSrc}
              alt="DILG Logo"
              className="h-20 mx-auto object-contain"
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">FM-SP-DILG-07-07B</p>
              <h2 className="text-base font-bold text-primary">
                CLIENT SATISFACTION SURVEY (ON-SITE)
              </h2>
            </div>
            <div className="text-left space-y-2">
              <h3 className="font-semibold text-sm text-foreground">Data Privacy Consent</h3>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-primary" />
                {DISCLAIMER.title}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {DISCLAIMER.text}
              </p>
            </div>

            {/* Consent checkbox */}
            <label
              className={cn(
                'flex items-start gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors text-left',
                consentChecked
                  ? 'border-primary/30 bg-primary/[0.04]'
                  : 'border-input hover:bg-accent/50',
              )}
            >
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary rounded"
              />
              <span className="text-xs text-muted-foreground leading-relaxed select-none">
                Pumapayag ako na kolektahin, gamitin, at itago ng DILG ang aking personal
                na datos alinsunod sa nakasaad sa itaas at sa ilalim ng Data Privacy Act
                (RA 10173).
              </span>
            </label>

            <Button
              onClick={() => setShowDisclaimer(false)}
              size="lg"
              variant="gold"
              disabled={!consentChecked}
              className="w-full rounded-xl"
            >
              Pumapayag at Simulan ang Sarbey
            </Button>
            {!consentChecked && (
              <p className="text-[10px] text-muted-foreground/50">
                Kailangan munang magbigay ng pahintulot bago magpatuloy.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4 bg-survey">
        <Card className="max-w-lg w-full rounded-2xl shadow-sm border border-t-2 border-t-gold">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto w-40 h-40 rounded-full ring-4 ring-gold/30 p-2">
              <DotLottiePlayer
                src="/Trophy.lottie"
                autoplay
                loop
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <h2 className="text-xl font-bold text-primary">Maraming Salamat!</h2>
            <p className="text-muted-foreground text-sm">
              Ang inyong tugon ay makatutulong sa pagpapabuti ng serbisyo publiko.
            </p>
            {refNumber && (
              <div className="mt-4 rounded-xl bg-muted/50 border border-border px-4 py-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Reference Number
                </p>
                <p className="text-sm font-mono font-bold text-primary select-all">
                  {refNumber}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Pakitago ang numerong ito para sa inyong talaan.
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
        className="fixed top-0 left-0 h-1 z-50 bg-gradient-to-r from-primary via-primary to-gold"
        animate={{ width: `${((sectionIdx + 1) / total) * 100}%` }}
        transition={spring}
      />

      <div className="flex-1 flex items-start justify-center p-4 pt-4 pb-28">
        <div className="max-w-lg w-full">

          {/* DILG header */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src={LogoSrc}
              alt="DILG Logo"
              className="h-7 object-contain"
            />
            <div className="text-[10px] text-muted-foreground tracking-wide uppercase leading-tight">
              <span className="font-semibold text-primary/80">DILG</span>{' '}
              Client Satisfaction Survey
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={sectionId}
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, x: -24 }}
              transition={spring}
            >
              <StepIndicator currentIndex={sectionIdx} total={total} />

              <Card className="rounded-2xl shadow-sm border border-t-2 border-t-primary">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-primary mb-6 pb-3 border-b border-border/50">
                    {SECTION_LABELS[sectionId]}
                  </h2>
                  {sectionError && (
                    <div className="mb-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3.5 text-sm text-amber-800 dark:text-amber-200" role="alert">
                      <p className="font-medium">⚠️ {sectionError}</p>
                    </div>
                  )}
                  {renderSection()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-t">
        <div className="max-w-lg mx-auto p-4 flex gap-3 items-center">
          {sectionIdx > 0 && (
            <Button variant="outline" onClick={prev} className="flex-1 rounded-xl">
              <ChevronLeft className="w-4 h-4" />
              Bumalik
            </Button>
          )}
          {!isLast ? (
            <Button onClick={next} className="flex-1 rounded-xl">
              Susunod
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="gold"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="flex-1 rounded-xl"
            >
              {submitting ? 'Ipinapadala\u2026' : 'Isumite ang Sarbey'}
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-2xl shadow-xl border border-t-2 border-t-gold max-w-sm w-full p-6 space-y-4"
          >
            <h3 className="font-bold text-lg text-center text-foreground">
              Kumpirmahin ang Sarbey
            </h3>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Nais mo bang ipadala ang iyong mga tugon? Pakisiguraduhing tama ang lahat ng
              iyong sagot bago magpatuloy.
            </p>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setShowConfirm(false)}
              >
                Kanselahin
              </Button>
              <Button
                variant="gold"
                className="flex-1 rounded-xl"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Ipinapadala\u2026' : 'Oo, ipadala'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <Toaster position="top-center" />
    </div>
    </>
  );
}
