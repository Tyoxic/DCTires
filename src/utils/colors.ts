export const COLORS = {
  primary: '#2196F3',
  primaryDark: '#1976D2',
  success: '#4CAF50',
  warning: '#FF9800',
  warningSoft: '#FFF3E0',
  error: '#F44336',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#222222',
  textMuted: '#666666',
  textFaint: '#999999',
  border: '#e0e0e0',
  chipBg: '#f0f0f0',
};

export function stockColor(qty: number): { bg: string; fg: string; label: string } {
  if (qty <= 0) return { bg: '#FFEBEE', fg: '#C62828', label: 'Out of stock' };
  if (qty <= 1) return { bg: '#FFF3E0', fg: '#E65100', label: 'Low stock' };
  return { bg: '#E8F5E9', fg: '#2E7D32', label: 'In stock' };
}
