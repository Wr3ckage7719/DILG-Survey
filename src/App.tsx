import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

import { type FormData, SECTIONS, SECTION_LABELS, INITIAL_FORM } from './types';
import { DISCLAIMER } from './data/questions';
import { submitSurvey } from './api/submit';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';

import StepOffice from './components/StepOffice';
import StepDemographics from './components/StepDemographics';
import SectionCC from './components/SectionCC';
import SectionSQD from './components/SectionSQD';
import SectionFeedback from './components/SectionFeedback';
import StepIndicator from './components/StepIndicator';

const REQUIRED_FIELDS: Record<string, (keyof FormData)[]> = {
  office: ['pangalanNgTanggapan', 'serbisyongIbinigay'],
  demographics: ['uriNgKliyente', 'edad', 'kasarian', 'rehiyon'],
  cc: ['cc1', 'cc2', 'cc3'],
  sqd: [],
  feedback: [],
};

function validate(sectionId: string, form: FormData): string | null {
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
      return `Punan ang ${labels[key] || key}`;
    }
  }
  return null;
}

export default function App() {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const update = useCallback((patch: Partial<FormData>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const sectionId = SECTIONS[sectionIdx];
  const total = SECTIONS.length;
  const isLast = sectionIdx === total - 1;

  const next = () => {
    const err = validate(sectionId, form);
    if (err) {
      toast.error(err);
      return;
    }
    setSectionIdx((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const prev = () => {
    setSectionIdx((s) => s - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    const err = validate(sectionId, form);
    if (err) {
      toast.error(err);
      return;
    }
    setSubmitting(true);
    const ok = await submitSurvey(form);
    setSubmitting(false);
    if (ok) {
      setSubmitted(true);
      toast.success('Naipadala ang inyong sarbey!');
    } else {
      toast.error('Hindi nakapag-submit. Pakisubukan muli.');
    }
  };

  const renderSection = () => {
    switch (sectionId) {
      case 'office': return <StepOffice form={form} onChange={update} />;
      case 'demographics': return <StepDemographics form={form} onChange={update} />;
      case 'cc': return <SectionCC form={form} onChange={update} />;
      case 'sqd': return <SectionSQD form={form} onChange={update} />;
      case 'feedback': return <SectionFeedback form={form} onChange={update} />;
    }
  };

  if (showDisclaimer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-lg w-full rounded-2xl shadow-sm border">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-xs text-muted-foreground">FM-SP-DILG-07-07B</p>
            <div>
              <h1 className="text-lg font-bold text-foreground">DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT</h1>
              <h2 className="text-base font-semibold text-primary mt-1">
                CLIENT SATISFACTION SURVEY (ON-SITE)
              </h2>
            </div>
            <div className="text-left space-y-2">
              <h3 className="font-semibold text-sm text-foreground">{DISCLAIMER.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {DISCLAIMER.text}
              </p>
            </div>
            <Button
              onClick={() => setShowDisclaimer(false)}
              size="lg"
              className="w-full rounded-xl"
            >
              Simulan ang Sarbey
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-lg w-full rounded-2xl shadow-sm border">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Maraming Salamat!</h2>
            <p className="text-muted-foreground text-sm">
              Ang inyong tugon ay makatutulong sa pagpapabuti ng serbisyo publiko.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-start justify-center p-4 pt-4 pb-28">
        <div className="max-w-lg w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={sectionId}
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              <Card className="rounded-2xl shadow-sm border">
                <CardContent className="p-6 space-y-4">
                  <StepIndicator currentIndex={sectionIdx} total={total} />
                  <h2 className="text-sm font-semibold text-foreground">
                    {SECTION_LABELS[sectionId]}
                  </h2>
                  {renderSection()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-sm border-t">
        <div className="max-w-lg mx-auto p-4 flex gap-3">
          {sectionIdx > 0 && (
            <Button variant="outline" onClick={prev} className="flex-1 rounded-xl">
              ← Bumalik
            </Button>
          )}
          {!isLast ? (
            <Button onClick={next} className="flex-1 rounded-xl">
              Susunod →
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
            >
              {submitting ? 'Ipinapadala…' : 'Isumite ang Sarbey'}
            </Button>
          )}
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
}
