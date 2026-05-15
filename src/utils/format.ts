import { format, parseISO } from 'date-fns';

export function money(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '$0';
  return n % 1 === 0 ? `$${n.toFixed(0)}` : `$${n.toFixed(2)}`;
}

export function moneySigned(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}${money(abs)}`;
}

export function sizeLabel(n: number): string {
  return n % 1 === 0 ? `${n}"` : `${n}"`;
}

export function formatServiceDate(iso: string, pattern = 'M/d/yyyy'): string {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatMonth(iso: string): string {
  try {
    return format(parseISO(iso + (iso.length === 7 ? '-01' : '')), 'MMMM yyyy');
  } catch {
    return iso;
  }
}

export function currentYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
