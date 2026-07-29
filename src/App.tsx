import { useState } from 'react';
import { type FormData, SECTIONS, SECTION_LABELS, INITIAL_FORM } from './types';
import { DISCLAIMER } from './data/questions';
import { submitSurvey } from './api/submit';
import StepOffice from './components/StepOffice';
import StepDemographics from './components/StepDemographics';
import SectionCC from './components/SectionCC';
import SectionSQD from './components/SectionSQD';
import SectionFeedback from './components/SectionFeedback';

export default function App() {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const update = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));
  const sectionId = SECTIONS[sectionIdx];
  const total = SECTIONS.length;
  const progress = Math.round(((sectionIdx + 1) / total) * 100);
  const isLast = sectionIdx === total - 1;

  const next = () => {
    if (sectionIdx < total - 1) {
      setSectionIdx((s) => s + 1);
      window.scrollTo(0, 0);
    }
  };

  const prev = () => {
    if (sectionIdx > 0) {
      setSectionIdx((s) => s - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    setError('');
    const ok = await submitSurvey(form);
    if (ok) setSubmitted(true);
    else setError('Hindi nakapag-submit. Subukan muli.');
  };

  if (showDisclaimer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
          <p className="text-xs text-gray-400 mb-2">FM-SP-DILG-07-07B</p>
          <h1 className="text-lg font-bold text-center mb-2">
            DEPARTMENT OF THE INTERIOR AND LOCAL GOVERNMENT
          </h1>
          <h2 className="text-base font-semibold text-center text-blue-800 mb-6">
            CLIENT SATISFACTION SURVEY (ON-SITE)
          </h2>
          <h3 className="font-semibold text-sm mb-2">{DISCLAIMER.title}</h3>
          <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{DISCLAIMER.text}</p>
          <button
            onClick={() => setShowDisclaimer(false)}
            className="w-full py-3 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800"
          >
            Simulan ang Sarbey
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-bold mb-2">Maraming Salamat!</h2>
          <p className="text-gray-600">Ang iyong tugon ay makatutulong sa pagpapabuti ng serbisyo publiko.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-start justify-center p-4 pt-8 pb-32">
        <div className="max-w-lg w-full">
          {/* Section title */}
          <div className="text-center mb-6">
            <div className="text-xs text-gray-400 mb-1">
              {sectionIdx + 1} / {total}
            </div>
            <h2 className="text-sm font-bold text-blue-800">{SECTION_LABELS[sectionId]}</h2>
          </div>

          {/* Render current section */}
          {sectionId === 'office' && <StepOffice form={form} onChange={update} />}
          {sectionId === 'demographics' && <StepDemographics form={form} onChange={update} />}
          {sectionId === 'cc' && <SectionCC form={form} onChange={update} />}
          {sectionId === 'sqd' && <SectionSQD form={form} onChange={update} />}
          {sectionId === 'feedback' && <SectionFeedback form={form} onChange={update} />}

          {/* Navigation */}
          <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 z-40">
            <div className="max-w-lg mx-auto flex gap-3">
              {sectionIdx > 0 && (
                <button onClick={prev} className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  ← Bumalik
                </button>
              )}
              {!isLast ? (
                <button onClick={next} className="flex-1 py-3 px-4 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800">
                  Susunod →
                </button>
              ) : (
                <button onClick={handleSubmit} className="flex-1 py-3 px-4 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800">
                  Isumite ang Sarbey
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="fixed bottom-20 left-0 w-full z-50">
              <div className="max-w-lg mx-auto bg-red-100 text-red-800 text-sm p-3 rounded-lg">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
