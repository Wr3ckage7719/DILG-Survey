import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  OFFICES,
  KLIYENTE,
  EDAD,
  KASARIAN,
  CC1_OPTIONS,
  CC2_OPTIONS,
  CC3_OPTIONS,
  SQD_OPTIONS,
  type BilingualList,
} from '../data/questions';
import { adminPrintResponse, type AdminRow } from '../api/admin';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  extractSqd,
  rowOffice,
  rowService,
  rowOtherService,
  rowClient,
  rowAge,
  rowSex,
  rowRegion,
  rowCc1,
  rowCc2,
  rowCc3,
  rowName,
  rowContact,
  rowEmail,
  rowSuggestions,
  rowLang,
  rowRef,
  rowTimestamp,
  formatTimestamp,
  pickLanguage,
} from './fields';

interface Props {
  row: AdminRow;
  token: string;
  onBack: () => void;
  onUnauthorized: () => void;
}

const SQD_RATINGS: BilingualList = SQD_OPTIONS;

/** Equality tolerant of whitespace/case/apostrophe variants. */
function eq(a: string, b: string): boolean {
  return a.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase() ===
    b.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();
}

/** The Apps Script returns a Google Doc URL (.../document/d/{id}/edit).
 *  The /preview endpoint is Google's embeddable viewer — it renders the doc
 *  like a PDF and includes a native print button. Pure client-side transform,
 *  no Apps Script changes. */
function toPreviewUrl(url: string): string | null {
  const m = url.match(/\/document\/d\/([^/?]+)/);
  return m ? `https://docs.google.com/document/d/${m[1]}/preview` : null;
}

function CheckList({ options, value }: { options: string[]; value: string }) {
  return (
    <div className="space-y-0.5">
      {options.map((o) => (
        <div key={o} className="flex items-start gap-2">
          <span className="shrink-0 leading-5">{eq(o, value) ? '☑' : '☐'}</span>
          <span className="leading-5">{o}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResponseDetail({ row, token, onBack, onUnauthorized }: Props) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genUrl, setGenUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // True when the failure is ambiguous — the Apps Script may have finished the
  // doc AFTER the request timed out, so a retry could create a duplicate.
  const [genAmbiguous, setGenAmbiguous] = useState(false);

  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewUrl(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewUrl]);

  const sqd = useMemo(() => extractSqd(row), [row]);
  const sqdLabels = useMemo(() => {
    const labels: string[] = [];
    for (const key of Object.keys(row)) {
      const m = key.match(/^SQD(\d+)\.\s*(.*)$/);
      if (m) labels[parseInt(m[1], 10)] = m[2];
    }
    return labels;
  }, [row]);

  // Render option lists in the respondent's language when possible.
  const lang = rowLang(row).toLowerCase().includes('english') ? 'en' : 'tl';
  const firstSqdValue = sqd.find((v) => v.trim() !== '') || '';
  const sqdRatings = pickLanguage(SQD_RATINGS.tl, SQD_RATINGS.en, firstSqdValue);
  const ageOptions = pickLanguage(EDAD.tl, EDAD.en, rowAge(row));
  const sexOptions = pickLanguage(KASARIAN.tl, KASARIAN.en, rowSex(row));
  const clientOptions = pickLanguage(KLIYENTE.tl, KLIYENTE.en, rowClient(row));
  const cc1Options = pickLanguage(CC1_OPTIONS.tl, CC1_OPTIONS.en, rowCc1(row));
  const cc2Options = pickLanguage(CC2_OPTIONS.tl, CC2_OPTIONS.en, rowCc2(row));
  const cc3Options = pickLanguage(CC3_OPTIONS.tl, CC3_OPTIONS.en, rowCc3(row));

  const isOtherService =
    rowService(row) === 'Other/s (Tukuyin ang iba pang serbisyo)' ||
    rowService(row) === 'Other/s (Specify other service)';

  const generateDoc = async () => {
    if (generating) return;
    setGenerating(true);
    setGenError('');
    setGenUrl('');
    setGenAmbiguous(false);
    const result = await adminPrintResponse(token, row.__row, 'auto');
    if (result.unauthorized) {
      onUnauthorized();
      return;
    }
    setGenerating(false);
    if (result.ok && result.url) {
      setGenUrl(result.url);
      setPreviewUrl(toPreviewUrl(result.url));
    } else {
      const err = result.detail || result.error || 'Failed to generate the printable document.';
      const ambiguous =
        result.error === 'upstream_timeout' ||
        (result.error || '').startsWith('Network error');
      setGenAmbiguous(ambiguous);
      // A timeout is not a failure of the template — the Apps Script keeps
      // working and the doc lands in the Drive output folder. Don't send the
      // user down the "template not set" path in that case.
      setGenError(
        ambiguous
          ? 'The document is taking longer than expected.'
          : err,
      );
    }
  };

  return (
    <div className="min-h-screen bg-survey">
      {/* Toolbar — hidden when printing */}
      <header className="no-print sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            Back to responses
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={generateDoc} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Printable Doc
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Generation feedback — hidden when printing */}
        <div className="no-print space-y-2 mb-4">
          {genError && (
            <div
              role="alert"
              className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="space-y-1 block">
                <span className="block">{genError}</span>
                {!genAmbiguous && (
                  <span className="block text-xs opacity-80">
                    Make sure the template document is set in the spreadsheet
                    (DILG Survey → Settings).
                  </span>
                )}
                {genAmbiguous && (
                  <span className="block text-xs opacity-80">
                    Google is still generating it in the background — check the
                    Drive output folder for <strong>DILG_Survey_…</strong> in about a
                    minute. Don’t click Generate again, or a duplicate may be created.
                  </span>
                )}
              </span>
            </div>
          )}
          {genUrl && (
            <p className="flex items-center gap-2 text-sm text-primary font-semibold">
              <ExternalLink className="w-4 h-4" />
              Printable document generated — preview opened below.
            </p>
          )}
        </div>

        {/* ─── Printable form copy ─── */}
        <div className="print-root bg-white rounded-2xl border border-border/60 shadow-[0_1px_6px_-1px_rgba(0,25,70,0.08)] overflow-hidden">
          {/* Form header */}
          <div className="border-b-4 border-primary/15 px-6 py-5 md:px-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src="/logo-3.png" alt="DILG Logo" className="h-14 object-contain" />
              <div className="leading-tight">
                <p className="text-[11px] text-muted-foreground">FM-SP-DILG-07-07</p>
                <h2 className="text-base md:text-lg font-extrabold text-primary tracking-tight">
                  CLIENT SATISFACTION SURVEY (ON-SITE)
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Record of response — Reference #{rowRef(row) || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 md:px-10 space-y-8">
            {/* 1. Office */}
            <section>
              <h3 className="text-sm font-bold text-primary border-b border-border pb-1.5 mb-4">
                1. OFFICE DETAILS
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Office / Operating unit
                  </p>
                  <CheckList options={OFFICES} value={rowOffice(row)} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Service availed
                  </p>
                  <p className="text-sm leading-6">
                    {isOtherService ? rowOtherService(row) || rowService(row) : rowService(row) || '—'}
                  </p>
                  {isOtherService && rowOtherService(row) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      (Other service specified: {rowOtherService(row)})
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* 2. Demographics */}
            <section>
              <h3 className="text-sm font-bold text-primary border-b border-border pb-1.5 mb-4">
                2. DEMOGRAPHICS
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Type of client
                  </p>
                  <CheckList options={clientOptions} value={rowClient(row)} />
                </div>
                <div className="grid gap-6">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Age
                    </p>
                    <CheckList options={ageOptions} value={rowAge(row)} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      Sex
                    </p>
                    <CheckList options={sexOptions} value={rowSex(row)} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Region of residence
                  </p>
                  <p className="text-sm leading-6">{rowRegion(row) || '—'}</p>
                </div>
              </div>
            </section>

            {/* 3. Citizen's Charter */}
            <section>
              <h3 className="text-sm font-bold text-primary border-b border-border pb-1.5 mb-4">
                3. CITIZEN&apos;S CHARTER (CC)
              </h3>
              <div className="grid gap-6">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    CC1 — Awareness of the CC
                  </p>
                  <CheckList options={cc1Options} value={rowCc1(row)} />
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      CC2 — Visibility of the CC
                    </p>
                    <CheckList options={cc2Options} value={rowCc2(row)} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      CC3 — Helpfulness of the CC
                    </p>
                    <CheckList options={cc3Options} value={rowCc3(row)} />
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Service Quality */}
            <section>
              <h3 className="text-sm font-bold text-primary border-b border-border pb-1.5 mb-4">
                4. SERVICE QUALITY (SQD)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border border-border">
                  <thead>
                    <tr className="bg-secondary/70">
                      <th className="border border-border px-2 py-1.5 text-left font-bold w-[55%]">
                        Statement
                      </th>
                      {sqdRatings.map((r) => (
                        <th key={r} className="border border-border px-1 py-1.5 text-center font-semibold align-bottom">
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sqd.map((value, i) => (
                      <tr key={i}>
                        <td className="border border-border px-2 py-1.5 leading-4">
                          <span className="font-semibold">SQD{i}.</span> {sqdLabels[i] || ''}
                        </td>
                        {sqdRatings.map((r) => (
                          <td
                            key={r}
                            className={cn(
                              'border border-border px-1 py-1.5 text-center',
                              eq(r, value) && 'bg-accent/10 font-bold text-primary',
                            )}
                          >
                            {eq(r, value) ? '✓' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 5. Feedback */}
            <section>
              <h3 className="text-sm font-bold text-primary border-b border-border pb-1.5 mb-4">
                5. FEEDBACK AND INFORMATION
              </h3>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Name (optional)
                  </p>
                  <p className="text-sm leading-6">{rowName(row) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Contact number
                  </p>
                  <p className="text-sm leading-6">{rowContact(row) || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Email address
                  </p>
                  <p className="text-sm leading-6 break-all">{rowEmail(row) || '—'}</p>
                </div>
                <div className="md:col-span-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Suggestions / comments
                  </p>
                  <p className="text-sm leading-6 whitespace-pre-wrap rounded-xl border border-dashed border-border px-3 py-2 min-h-10">
                    {rowSuggestions(row) || '—'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-6 py-4 md:px-10 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              Reference #: <strong className="text-primary font-mono">{rowRef(row) || '—'}</strong>
            </span>
            <span>Submitted: {formatTimestamp(rowTimestamp(row))}</span>
            <span>Language: {lang === 'en' ? 'English' : 'Tagalog'}</span>
            <span className="ml-auto">
              FM-SP-DILG-07-07 · DILG Client Satisfaction Survey (On-Site)
            </span>
          </div>
        </div>
      </main>

      {previewUrl && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Printable document preview"
        >
          <div className="w-full max-w-4xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-white shrink-0">
              <p className="text-sm font-semibold text-primary truncate">
                Printable document — preview
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={genUrl || previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in new tab
                </a>
                <Button variant="outline" size="sm" onClick={() => setPreviewUrl(null)}>
                  Close
                </Button>
              </div>
            </div>
            <iframe
              src={previewUrl}
              title="Printable document preview"
              className="flex-1 w-full border-0 bg-white"
              allow="fullscreen"
            />
            <p className="shrink-0 px-4 py-2 text-xs text-muted-foreground bg-secondary/40 border-t border-border/40">
              Use the print icon in the preview toolbar to print or save as PDF.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
