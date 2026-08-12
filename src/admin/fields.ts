import type { AdminRow } from '../api/admin';

/** Case-insensitive first value whose key matches the pattern (like the
 * Apps Script getValueByPattern helper). */
export function findValue(row: AdminRow, pattern: RegExp): string {
  for (const key of Object.keys(row)) {
    if (pattern.test(key)) {
      const v = row[key];
      return v === undefined || v === null ? '' : String(v);
    }
  }
  return '';
}

export function extractSqd(row: AdminRow): string[] {
  const out = Array<string>(9).fill('');
  for (const key of Object.keys(row)) {
    const m = key.match(/^SQD(\d+)\./);
    if (m) {
      const i = parseInt(m[1], 10);
      if (i >= 0 && i < 9) out[i] = String(row[key] ?? '');
    }
  }
  return out;
}

export function rowOffice(row: AdminRow): string {
  return findValue(row, /Pangalan ng tanggapan/);
}
export function rowService(row: AdminRow): string {
  return findValue(row, /Serbisyong ibinigay/);
}
export function rowOtherService(row: AdminRow): string {
  return findValue(row, /Serbisyong iba/);
}
export function rowClient(row: AdminRow): string {
  return findValue(row, /Uri ng Kliyente/);
}
export function rowAge(row: AdminRow): string {
  return findValue(row, /Edad/);
}
export function rowSex(row: AdminRow): string {
  return findValue(row, /Kasarian/);
}
export function rowRegion(row: AdminRow): string {
  return findValue(row, /Rehiyon/);
}
export function rowCc1(row: AdminRow): string {
  return findValue(row, /CC1\./);
}
export function rowCc2(row: AdminRow): string {
  return findValue(row, /CC2\./);
}
export function rowCc3(row: AdminRow): string {
  return findValue(row, /CC3\./);
}
export function rowName(row: AdminRow): string {
  return findValue(row, /Pangalan \(optional\)/);
}
export function rowContact(row: AdminRow): string {
  return findValue(row, /Contact number/);
}
export function rowEmail(row: AdminRow): string {
  return findValue(row, /Email address/);
}
export function rowSuggestions(row: AdminRow): string {
  return findValue(row, /mungkahi/i);
}
export function rowLang(row: AdminRow): string {
  return findValue(row, /Wika/);
}
export function rowRef(row: AdminRow): string {
  return findValue(row, /Reference Number/);
}
export function rowTimestamp(row: AdminRow): string {
  return findValue(row, /Timestamp/);
}

/** Show a short human date ("Aug 12, 2026 2:30 PM") from the stored timestamp.
 * The sheet stores Asia/Manila wall-clock time without a timezone suffix
 * ("yyyy-MM-dd HH:mm:ss"), so parse the components as Manila explicitly —
 * otherwise viewers outside Manila see shifted times. */
export function formatTimestamp(value: string): string {
  if (!value) return '—';
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const utcMs = Date.UTC(
      Number(m[1]), Number(m[2]) - 1, Number(m[3]),
      Number(m[4]), Number(m[5]), m[6] ? Number(m[6]) : 0,
    );
    const d = new Date(utcMs - 8 * 60 * 60 * 1000); // UTC+8 → Asia/Manila
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Pick the option list (TL or EN) that contains the stored value. */
export function pickLanguage<T extends string>(tl: T[], en: T[], value: string): T[] {
  if (en.some((o) => o === value)) return en;
  return tl;
}
