import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  RefreshCw,
  LogOut,
  Loader2,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Printer,
  Check,
  X,
  Clock,
  ExternalLink,
  FileDown,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  adminFetchResponses,
  adminBatchPrintChunk,
  adminExportBatchPdf,
  describeAdminError,
  type AdminRow,
} from '../api/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  rowClient,
  rowLang,
  rowOffice,
  rowRef,
  rowRegion,
  rowService,
  rowTimestamp,
  formatTimestamp,
} from './fields';
import ResponseDetail from './ResponseDetail';

interface Props {
  token: string;
  onLogout: () => void;
}

const PAGE_SIZE = 25;

type BatchStatus = 'pending' | 'working' | 'done' | 'error' | 'ambiguous';

interface BatchItem {
  row: number;
  label: string;
  status: BatchStatus;
  error?: string;
}

export default function Dashboard({ token, onLogout }: Props) {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Batch selection + generation
  const [selectedRows, setSelectedRows] = useState<Set<number>>(() => new Set());
  const [batchItems, setBatchItems] = useState<BatchItem[] | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchUrl, setBatchUrl] = useState<string | null>(null);
  const [batchPartialDocId, setBatchPartialDocId] = useState<string | null>(null);
  // Where a timed-out chunk stopped, so "Retry timed out" can resume the SAME
  // master document (skip already-merged rows) instead of starting a duplicate.
  // batchResumeChunk: chunk index to re-run from; batchResumeMasterId: master
  // doc at that point (null when the timeout hit before the first chunk).
  const [batchResumeChunk, setBatchResumeChunk] = useState<number | null>(null);
  const [batchResumeMasterId, setBatchResumeMasterId] = useState<string | null>(null);
  const [batchChunkIdx, setBatchChunkIdx] = useState(0);
  const batchCancelRef = useRef(false);

  // Batch documents are built in chunks of a few rows per request (each call
  // must stay well under the Vercel 60s ceiling), threaded through the master
  // document id. All chunks fill the SAME document — one sheet per response.
  // Kept at 2: each merged entry costs ~10-20s upstream (copy + open + merge +
  // save + reopen + append) and the LAST chunk additionally exports the PDF
  // (~10-30s), so a chunk of 2 stays safely inside the 58s relay budget even
  // when Google's edge is slow.
  const BATCH_CHUNK_SIZE = 2;

  const load = useCallback(async (initial = false) => {
    // Only the first load blanks the table; refreshes keep the stale rows
    // visible so the screen doesn't flicker to a spinner.
    if (initial) setLoading(true);
    setError('');
    const result = await adminFetchResponses(token);
    if (result.unauthorized) {
      onLogout();
      return;
    }
    if (!result.ok) {
      setError(describeAdminError(result));
      if (initial) {
        setRows(null);
        setLoading(false);
      }
      return;
    }
    setRows(result.rows || []);
    if (initial) setLoading(false);
  }, [token, onLogout]);

  useEffect(() => {
    load(true);
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* ─── Batch selection ─── */
  const toggleRow = (row: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (checked) next.add(r.__row);
        else next.delete(r.__row);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedRows(new Set());

  /** Rows selected by the user, in display (newest-first) order. */
  const selectedRowsInDisplay = (): AdminRow[] => sorted.filter((r) => selectedRows.has(r.__row));

  /* ─── Batch generation ───
   * Produces ONE document containing one filled form per selected response.
   * Rows are sent in chunks (BATCH_CHUNK_SIZE) so no single request exceeds
   * the Vercel 60s ceiling; the master document id is threaded through each
   * chunk, and the last chunk exports the PDF and returns the document URL. */
  /** Runs the batch in chunks. startChunk / startMasterDocId / resume support
   *  the timeout-retry path: a retry re-runs from the failed chunk, threading
   *  the same master doc id so the server skips already-merged rows (resume=-
   *  true also lets a chunk-1 retry rediscover an orphaned master the timeout
   *  hid from the client). Fresh runs always start at chunk 0 with resume off. */
  const runBatch = async (
    items: BatchItem[],
    startChunk = 0,
    startMasterDocId: string | null = null,
    resume = false,
  ) => {
    const tick = (row: number, patch: Partial<BatchItem>) =>
      setBatchItems((prev) => (prev ? prev.map((it) => (it.row === row ? { ...it, ...patch } : it)) : prev));

    const chunkList: number[][] = [];
    for (let i = 0; i < items.length; i += BATCH_CHUNK_SIZE) {
      chunkList.push(items.slice(i, i + BATCH_CHUNK_SIZE).map((it) => it.row));
    }

    let masterDocId = startMasterDocId;
    for (let c = startChunk; c < chunkList.length; c++) {
      if (batchCancelRef.current) break;
      const chunk = chunkList[c];
      chunk.forEach((row) => tick(row, { status: 'working' }));
      setBatchChunkIdx(c);
      const isFinal = c === chunkList.length - 1;
      const result = await adminBatchPrintChunk(token, chunk, masterDocId, isFinal, undefined, resume);
      if (result.unauthorized) {
        setBatchRunning(false);
        onLogout();
        return;
      }
      if (!result.ok) {
        // A timeout is ambiguous: Google may have appended the rows anyway.
        // Remember exactly where we stopped so "Retry timed out" can resume the
        // same master document (the server skips rows it already merged).
        const code = result.error || '';
        const ambiguous = code === 'upstream_timeout' || code.startsWith('Network error');
        chunk.forEach((row) =>
          tick(row, { status: ambiguous ? 'ambiguous' : 'error', error: describeAdminError(result) }),
        );
        if (ambiguous) {
          setBatchResumeChunk(c);
          setBatchResumeMasterId(masterDocId);
        } else {
          setBatchResumeChunk(null);
          setBatchResumeMasterId(null);
        }
        // If an EARLIER chunk already created the master document, surface it:
        // the rows merged so far live in that doc, even though the final chunk
        // failed. Without this the admin sees no link at all — the dead-end the
        // user hit. The doc URL is deterministic from the id (same URL the
        // final chunk would have returned).
        if (masterDocId) setBatchPartialDocId(masterDocId);
        break;
      }
      // This chunk made progress — clear the stale resume point (a successful
      // retry consumes it; a later failure records its own).
      setBatchResumeChunk(null);
      setBatchResumeMasterId(null);
      if (result.docId) masterDocId = result.docId;
      chunk.forEach((row) => {
        if (result.failedRows && result.failedRows.includes(row)) {
          tick(row, { status: 'error', error: 'This response could not be included in the batch document.' });
        } else {
          tick(row, { status: 'done' });
        }
      });
      if (isFinal && result.url) {
        setBatchUrl(result.url);
        setBatchPartialDocId(null);
        // Best-effort companion PDF export — fired AFTER the batch result is in
        // so the heavy conversion never blocks it (the doc URL is the deliverable,
        // the PDF is a Drive convenience). A failure here must not fail the batch.
        if (result.docId) {
          try {
            await adminExportBatchPdf(token, result.docId);
          } catch {
            /* PDF is optional */
          }
        }
      }
    }
    setBatchRunning(false);
  };

  const startBatch = async () => {
    if (batchRunning || selectedRows.size === 0) return;
    batchCancelRef.current = false;
    setBatchUrl(null);
    setBatchPartialDocId(null);
    setBatchChunkIdx(0);
    setBatchResumeChunk(null);
    setBatchResumeMasterId(null);
    const items: BatchItem[] = selectedRowsInDisplay().map((r) => ({
      row: r.__row,
      label: rowRef(r) || `Row ${r.__row}`,
      status: 'pending',
    }));
    if (!items.length) return;
    setBatchItems(items);
    setBatchRunning(true);
    await runBatch(items);
  };

  /** Re-run only the rows that failed — they were NOT included in the batch
   *  document, so a fresh batch document for just those rows is correct (no
   *  duplicates). */
  const retryFailed = async () => {
    if (batchRunning || !batchItems) return;
    const failed = batchItems.filter((it) => it.status === 'error');
    if (!failed.length) return;
    batchCancelRef.current = false;
    setBatchUrl(null);
    setBatchPartialDocId(null);
    setBatchChunkIdx(0);
    setBatchResumeChunk(null);
    setBatchResumeMasterId(null);
    setBatchItems((prev) =>
      prev ? prev.map((it) => (it.status === 'error' ? { ...it, status: 'pending', error: undefined } : it)) : prev,
    );
    setBatchRunning(true);
    await runBatch(failed.map((it) => ({ ...it, status: 'pending' as BatchStatus })));
  };

  /** Resume a timed-out batch from the failed chunk. Rows that already made it
   *  into the master document are skipped server-side (per-row progress), so
   *  re-running is safe — it continues the SAME document instead of creating a
   *  duplicate. When the timeout hit the first chunk (no master id known), the
   *  server rediscovers the orphaned master via its resume handoff. */
  const retryTimedOut = async () => {
    if (batchRunning || !batchItems || batchResumeChunk === null) return;
    batchCancelRef.current = false;
    setBatchRunning(true);
    await runBatch(batchItems, batchResumeChunk, batchResumeMasterId, true);
  };

  const cancelBatch = () => {
    batchCancelRef.current = true;
  };

  const closeBatch = () => {
    setBatchItems(null);
    setBatchUrl(null);
    setBatchPartialDocId(null);
    setBatchResumeChunk(null);
    setBatchResumeMasterId(null);
    clearSelection();
  };

  /* ─── Batch stats (derived) ─── */
  const batchDone = batchItems?.filter((it) => it.status === 'done').length ?? 0;
  const batchFailed = batchItems?.filter((it) => it.status === 'error').length ?? 0;
  const batchAmbiguous = batchItems?.filter((it) => it.status === 'ambiguous').length ?? 0;
  const batchTotal = batchItems?.length ?? 0;
  const batchProgress = batchItems?.filter((it) => it.status !== 'pending' && it.status !== 'working').length ?? 0;
  const batchPct = batchTotal ? Math.round((batchProgress / batchTotal) * 100) : 0;

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        rowTimestamp(r),
        rowRef(r),
        rowOffice(r),
        rowService(r),
        rowClient(r),
        rowRegion(r),
        rowLang(r),
      ].some((v) => v.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  // Newest first (sheet rows are in submission order).
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.__row - a.__row), [filtered]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const resetPage = () => setPage(0);

  if (selected) {
    return (
      <ResponseDetail
        row={selected}
        onBack={() => setSelected(null)}
        token={token}
        onUnauthorized={onLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-survey">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo-3.png" alt="DILG Logo" className="h-10 object-contain" />
            <div className="leading-tight">
              <h1 className="text-sm font-extrabold text-primary tracking-tight">
                SURVEY ADMIN
              </h1>
              <p className="text-xs text-muted-foreground">
                Responses · Print · Export
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              title="Refresh data"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Stats + search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div>
            <p className="text-lg font-bold text-foreground">
              {loading ? 'Loading responses…' : `${sorted.length} response${sorted.length === 1 ? '' : 's'}`}
              {query && <span className="text-muted-foreground text-sm font-medium"> (filtered)</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              Click a row to view the full response · tick rows to generate one document with all of them.
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                resetPage();
              }}
              placeholder="Search by date, ref #, office, service…"
              className="pl-10 rounded-xl bg-white"
              aria-label="Search responses"
            />
          </div>
        </div>

        {/* Selection action bar */}
        {!batchItems && selectedRows.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3"
          >
            <p className="text-sm font-semibold text-primary">
              {selectedRows.size} selected
              <span className="font-normal text-muted-foreground ml-2 hidden sm:inline">
                — one document will be generated, with one sheet per response
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
              <Button variant="accent" size="sm" onClick={startBatch} disabled={batchRunning}>
                <FileDown className="w-4 h-4" />
                Generate batch document ({selectedRows.size})
              </Button>
            </div>
          </motion.div>
        )}

        {/* Batch progress panel */}
        {batchItems && batchItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/20 bg-white px-4 py-4 space-y-3"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-primary flex items-center gap-2">
                {batchRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating batch document…
                  </>
                ) : batchUrl ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Batch document ready
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Batch finished
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {batchProgress}/{batchTotal}
                {batchFailed > 0 && <span className="text-destructive"> · {batchFailed} failed</span>}
                {batchAmbiguous > 0 && (
                  <span className="text-amber-600"> · {batchAmbiguous} timed out</span>
                )}
              </p>
            </div>

            {/* Determinate progress bar */}
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${batchPct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {batchRunning && (
              <p className="text-xs text-muted-foreground">
                One document, one sheet per response — processing responses{' '}
                {batchChunkIdx * BATCH_CHUNK_SIZE + 1}–
                {Math.min(batchTotal, (batchChunkIdx + 1) * BATCH_CHUNK_SIZE)} of {batchTotal}.
              </p>
            )}

            {/* Per-row status list */}
            {batchItems.length > 1 && (
              <ul className="max-h-48 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border/50 text-xs">
                {batchItems.map((it) => (
                  <li key={it.row} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="shrink-0">
                      {it.status === 'working' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : it.status === 'done' ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : it.status === 'ambiguous' ? (
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                      ) : it.status === 'error' ? (
                        <X className="w-3.5 h-3.5 text-destructive" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-border inline-block" />
                      )}
                    </span>
                    <span className="font-mono truncate max-w-[220px]">{it.label}</span>
                    {it.status === 'error' && (
                      <span className="ml-auto text-destructive truncate max-w-[300px] shrink-0">
                        {it.error || 'Failed'}
                      </span>
                    )}
                    {it.status === 'ambiguous' && (
                      <span className="ml-auto text-amber-600 shrink-0">
                        May still be in Drive — check the output folder.
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Final link — one document for the whole selection */}
            {batchUrl && (
              <div className="flex items-start gap-2 rounded-xl border border-green-600/30 bg-green-600/5 px-3.5 py-3">
                <FileDown className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    One document with {batchTotal} response{batchTotal === 1 ? '' : 's'} is ready.
                  </p>
                  <a
                    href={batchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open the batch document
                  </a>
                  <p className="text-xs text-muted-foreground">
                    Saved to the Drive output folder as a Google Doc + PDF.
                  </p>
                </div>
              </div>
            )}

            {/* Partial document — an earlier chunk succeeded but the final
                chunk timed out: the merged rows live in the master doc even
                though the final link never came back. */}
            {batchPartialDocId && !batchUrl && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  Partial document created
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  A chunk timed out before the final link was returned, but{' '}
                  {batchDone} of {batchTotal} response{batchTotal === 1 ? '' : 's'} are already in
                  the document. Use “Retry timed out” to resume the same document — already-merged
                  rows are skipped, so nothing is duplicated.
                </p>
                <a
                  href={`https://docs.google.com/document/d/${batchPartialDocId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 underline decoration-amber-700/40 underline-offset-4 hover:decoration-amber-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open the partial document
                </a>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {batchRunning ? (
                <Button variant="outline" size="sm" onClick={cancelBatch}>
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              ) : (
                <>
                  {batchAmbiguous > 0 && (
                    <Button variant="outline" size="sm" onClick={retryTimedOut}>
                      <RefreshCw className="w-4 h-4" />
                      Retry {batchAmbiguous} timed out
                    </Button>
                  )}
                  {batchFailed > 0 && (
                    <Button variant="outline" size="sm" onClick={retryFailed}>
                      <RefreshCw className="w-4 h-4" />
                      Retry {batchFailed} failed
                    </Button>
                  )}
                  <Button size="sm" onClick={closeBatch}>
                    Close
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{error}</p>
              <button onClick={refresh} className="underline mt-1 font-semibold">
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !error && (
          <div className="rounded-2xl border border-border/60 bg-white px-6 py-16 text-center text-muted-foreground text-sm">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
            Fetching survey responses…
          </div>
        )}

        {/* Empty */}
        {!loading && !error && sorted.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-white px-6 py-16 text-center text-muted-foreground text-sm">
            <Inbox className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
            {query ? 'No responses match your search.' : 'No survey responses yet.'}
          </div>
        )}

        {/* Table */}
        {!loading && !error && sorted.length > 0 && (
          <>
            <div className="rounded-2xl border border-border/60 bg-white overflow-hidden shadow-[0_1px_6px_-1px_rgba(0,25,70,0.08)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary rounded"
                          checked={pageRows.length > 0 && pageRows.every((r) => selectedRows.has(r.__row))}
                          onChange={(e) => togglePage(e.target.checked)}
                          aria-label="Select all rows on this page"
                          disabled={batchRunning}
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap w-10">#</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Reference #</th>
                      <th className="px-4 py-3 font-semibold">Office</th>
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Client</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Region</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Lang</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {pageRows.map((r) => (
                      <tr
                        key={r.__row}
                        onClick={() => setSelected(r)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelected(r);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`View response ${r.__row}`}
                        className="cursor-pointer transition-colors hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="size-4 accent-primary rounded"
                            checked={selectedRows.has(r.__row)}
                            onChange={() => toggleRow(r.__row)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select row ${r.__row}`}
                            disabled={batchRunning}
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{r.__row}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                          {formatTimestamp(rowTimestamp(r))}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-primary">
                          {rowRef(r) || '—'}
                        </td>
                        <td className="px-4 py-3 max-w-[220px] truncate">{rowOffice(r)}</td>
                        <td className="px-4 py-3 max-w-[260px] truncate">{rowService(r)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{rowClient(r)}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate">{rowRegion(r)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                            {rowLang(r) || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <Printer className="w-4 h-4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Showing {sorted.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
                {Math.min(sorted.length, (safePage + 1) * PAGE_SIZE)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
