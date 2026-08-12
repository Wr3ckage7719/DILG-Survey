import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import {
  adminFetchResponses,
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

export default function Dashboard({ token, onLogout }: Props) {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
      setError(result.error || result.detail || 'Failed to load responses.');
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
              Click a row to view the full response and print a copy.
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
