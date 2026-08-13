import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle,
  AlertTriangle,
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
import { adminPrintResponse, describeAdminError, type AdminRow } from '../api/admin';
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

/** Escape dynamic text before it lands in the standalone tab's HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Branded standalone page shown in the pre-opened tab while the doc is being
 *  generated. stage: 0 connecting → 1 building → 2 still working. */
function tabHtml(stage: number, error?: string): string {
  const title = 'Preparing your printable document…';
  const stages = [
    'Connecting to Google…',
    'Building the printable document…',
    'Still working — this can take up to a minute…',
  ];
  const body = error
    ? `
      <div class="card">
        <div class="icon">!</div>
        <h1>Document could not be prepared</h1>
        <p class="err-text">${escapeHtml(error)}</p>
        <p class="hint">If the request timed out, Google may still be generating it — check the Drive output folder for <strong>DILG_Survey_…</strong>.</p>
      </div>`
    : `
      <div class="card">
        <div class="ring"></div>
        <h1>${title}</h1>
        <p>${stages[stage]}</p>
        <div class="badge"><img src="/logo-3.png" alt="" style="height:16px;opacity:.7" />DILG Client Satisfaction Survey</div>
      </div>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial,sans-serif;background:radial-gradient(1200px 600px at 50% -10%,#0b2f73 0%,#001a52 55%,#001036 100%);color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{text-align:center;max-width:440px;padding:32px 24px}
  .ring{width:64px;height:64px;margin:0 auto 24px;border:5px solid rgba(255,255,255,.15);border-top-color:#f0b429;border-radius:50%;animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  h1{font-size:17px;line-height:1.35;margin:0 0 8px;font-weight:700}
  p{font-size:13px;line-height:1.55;color:rgba(255,255,255,.78);margin:0}
  .icon{width:56px;height:56px;margin:0 auto 20px;border-radius:50%;background:rgba(255,255,255,.08);color:#ff9b9b;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800}
  .err-text{color:#ffc2c2;font-size:13px}
  .hint{margin-top:12px;font-size:12px;color:rgba(255,255,255,.55)}
  .badge{margin-top:28px;display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.45)}
</style>
</head>
<body>${body}</body>
</html>`;
}

/** Rewrite the standalone tab's content (guarded — the tab may have been
 *  closed or navigated away by the time a staged update fires). */
function writeTab(tab: Window | null, html: string): void {
  if (!tab || tab.closed) return;
  try {
    tab.document.open();
    tab.document.write(html);
    tab.document.close();
  } catch {
    /* cross-origin / after navigation — the real page is already showing */
  }
}

/** Equality tolerant of whitespace/case/apostrophe variants. */
function eq(a: string, b: string): boolean {
  return a.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase() ===
    b.replace(/[\u2018\u2019]/g, "'").trim().toLowerCase();
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

/** Faithful form copy of one response. Rendered directly in the detail view;
 *  the `.print-root` class carries the print CSS (Ctrl+P / Cmd+P prints it). */
function PrintableDocument({ row }: { row: AdminRow }) {
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

  return (
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
  );
}

export default function ResponseDetail({ row, token, onBack, onUnauthorized }: Props) {
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [genUrl, setGenUrl] = useState('');
  // True when the failure is ambiguous — the Apps Script may have finished the
  // doc AFTER the request timed out, so a retry could create a duplicate.
  const [genAmbiguous, setGenAmbiguous] = useState(false);
  // True when the failure is upstream (network / bad response / config) — the
  // template hint would be misleading here, so a config hint is shown instead.
  const [genUnreachable, setGenUnreachable] = useState(false);
  // Placeholder tokens the merge could not fill (e.g. letterhead keys in the
  // document header section) — surfaced so a raw {{...}} never ships silently.
  const [genLeftovers, setGenLeftovers] = useState<string[] | null>(null);
  // Animation stage while generating: 0 sending → 1 building → 2 still working.
  const [genStage, setGenStage] = useState(0);

  // Advance the "building" copy as generation takes longer, so the panel never
  // looks frozen. Reset on a new run.
  useEffect(() => {
    if (!generating) return;
    setGenStage(0);
    const t1 = setTimeout(() => setGenStage(1), 2500);
    const t2 = setTimeout(() => setGenStage(2), 12000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [generating]);

  const genStageText =
    genStage === 0
      ? 'Sending request to Google…'
      : genStage === 1
        ? 'Building the printable document…'
        : 'Still working — documents can take up to a minute…';

  /** Generate the official document and open it, popup-safe: the tab is opened
   *  synchronously inside the click gesture (browsers silently block
   *  window.open AFTER an awaited fetch), then pointed at the generated URL.
   *  While Google works, the tab shows a branded loading screen whose copy
   *  advances over time so it never looks frozen. */
  const generateDoc = async () => {
    if (generating) return;
    setGenerating(true);
    setGenError('');
    setGenUrl('');
    setGenAmbiguous(false);
    setGenUnreachable(false);
    setGenLeftovers(null);
    const tab = window.open('', '_blank');
    const tabTimers: number[] = [];
    if (tab) {
      writeTab(tab, tabHtml(0));
      tabTimers.push(window.setTimeout(() => writeTab(tab, tabHtml(1)), 6000));
      tabTimers.push(window.setTimeout(() => writeTab(tab, tabHtml(2)), 16000));
    }
    const stopTabTimers = () => tabTimers.forEach((t) => window.clearTimeout(t));
    const result = await adminPrintResponse(token, row.__row, 'auto');
    if (result.unauthorized) {
      stopTabTimers();
      tab?.close();
      onUnauthorized();
      return;
    }
    setGenerating(false);
    if (result.ok && result.url) {
      // Archival action: the spreadsheet engine drops the official doc + PDF
      // into the Drive output folder. Point the pre-opened tab at it.
      setGenUrl(result.url);
      if (result.leftovers && result.leftovers.length) setGenLeftovers(result.leftovers);
      stopTabTimers();
      try {
        if (tab && !tab.closed) tab.location.href = result.url;
        else window.location.href = result.url; // popup fully blocked — fall back
      } catch {
        window.location.href = result.url;
      }
    } else {
      stopTabTimers();
      const code = result.error || '';
      // A timeout is not a failure of the template — the Apps Script keeps
      // working and the doc lands in the Drive output folder. Don't send the
      // user down the "template not set" path in that case.
      const ambiguous =
        code === 'upstream_timeout' ||
        code === 'Network error' ||
        code.startsWith('Network error');
      const unreachable =
        code === 'upstream_unreachable' ||
        code === 'upstream_bad_response' ||
        code === 'server_config_error';
      setGenAmbiguous(ambiguous);
      setGenUnreachable(unreachable);
      const message = ambiguous
        ? 'The document is taking longer than expected.'
        : unreachable
          ? describeAdminError(result)
          : result.detail || result.error || 'Failed to generate the printable document.';
      setGenError(message);
      writeTab(tab, tabHtml(0, message));
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
          {generating && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              role="status"
              className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <p className="text-sm font-semibold text-primary">{genStageText}</p>
                  <div className="h-1.5 rounded-full bg-primary/10 overflow-hidden">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-accent"
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Google is building the official document + PDF. It opens in the
                    new tab automatically once ready.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          {genError && (
            <div
              role="alert"
              className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="space-y-1 block">
                <span className="block">{genError}</span>
                {genAmbiguous && (
                  <span className="block text-xs opacity-80">
                    Google is still generating it in the background — check the
                    Drive output folder for <strong>DILG_Survey_…</strong> in about a
                    minute. Don’t click Generate again, or a duplicate may be created.
                  </span>
                )}
                {genUnreachable && (
                  <span className="block text-xs opacity-80">
                    The Apps Script deployment may be deleted or access-restricted.
                    Check APPS_SCRIPT_URL in Vercel and the deployment settings
                    (Execute as: Me, Who has access: Anyone).
                  </span>
                )}
                {!genAmbiguous && !genUnreachable && (
                  <span className="block text-xs opacity-80">
                    Make sure the template document is set in the spreadsheet
                    (DILG Survey → Settings).
                  </span>
                )}
              </span>
            </div>
          )}
          {genUrl && (
            <a
              href={genUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary font-semibold underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              <ExternalLink className="w-4 h-4" />
              Printable document generated — open it in a new tab
            </a>
          )}
          {genLeftovers && genLeftovers.length > 0 && (
            <div
              role="alert"
              className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-xl px-3 py-2.5"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="space-y-1 block">
                <span className="block font-semibold">Some placeholders could not be filled:</span>
                <span className="block font-mono text-xs break-all">{genLeftovers.join('  ')}</span>
                <span className="block text-xs opacity-80">
                  Likely in the document letterhead/header section — if so, move those
                  placeholders into the document body, or run DILG Survey → Deployment
                  Diagnostics and send the output.
                </span>
              </span>
            </div>
          )}
        </div>

      {/* ─── Printable form copy ─── */}
      <PrintableDocument row={row} />
    </main>
    </div>
  );
}
