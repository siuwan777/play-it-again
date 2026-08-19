export function isListingSold(status?: string) {
  return status === 'sold';
}

export function formatSoldDate(soldAt: unknown): string {
  if (!soldAt) return '今天';

  try {
    const timestamp = soldAt as { toDate?: () => Date };
    const date = timestamp.toDate ? timestamp.toDate() : new Date(soldAt as string);
    return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'numeric', day: 'numeric' });
  } catch {
    return '今天';
  }
}
