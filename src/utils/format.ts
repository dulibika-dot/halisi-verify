const numberFmt = new Intl.NumberFormat('en-KE');
const compactFmt = new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 });

export const formatNumber = (n: number) => numberFmt.format(n);
export const formatCompact = (n: number) => compactFmt.format(n);

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "2 minutes ago", "3 hours ago", "5 days ago" */
export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(iso);
}

/** 839274615 -> "839 274 615" (easier to read aloud). Uses non-breaking spaces so a code never wraps. */
export function formatCode(code: string): string {
  return code.replace(/(\d{3})(?=\d)/g, '$1 ');
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Date string for <input type="date"> */
export function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
