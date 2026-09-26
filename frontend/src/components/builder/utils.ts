export function formatDate(s?: string): string {
  if (!s) return '-';
  try { return new Date(s).toLocaleString(); } catch { return String(s); }
}

export function formatBytes(n?: number): string {
  if (!n || n <= 0) return '-';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export type BadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | undefined;

export function statusVariant(status?: string): BadgeVariant {
  switch ((status || '').toLowerCase()) {
    case 'completed': return 'success';
    case 'failed': return 'destructive';
    case 'pending': return 'secondary';
    case 'started': return 'warning';
    case 'cancelled': return 'destructive';
    default: return 'default';
  }
}
