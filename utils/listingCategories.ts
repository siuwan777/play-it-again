export type ListingCategory = {
  id: string;
  name: string;
  icon: string;
};

export const LISTING_CATEGORIES: ListingCategory[] = [
  { id: 'eguitar', name: '電結他', icon: '🎸' },
  { id: 'aguitar', name: '木結他', icon: '🎻' },
  { id: 'bass', name: '低音結他', icon: '🎸' },
  { id: 'ukulele', name: '烏克麗麗', icon: '🪕' },
  { id: 'keyboard', name: '鍵琴', icon: '🎹' },
  { id: 'winds', name: '管樂', icon: '🎷' },
  { id: 'strings', name: '弦樂', icon: '🎻' },
  { id: 'effects', name: '效果器', icon: '🎛️' },
  { id: 'amps', name: '功放 (Amp)', icon: '🔊' },
  { id: 'drums', name: '鼓組', icon: '🥁' },
  { id: 'mic', name: '咪 / 錄音', icon: '🎤' },
  { id: 'dj', name: 'DJ 器材', icon: '🎧' },
  { id: 'other', name: '其他', icon: '📦' },
];

export const MARKETPLACE_CATEGORIES: ListingCategory[] = [
  { id: 'all', name: '全部', icon: '🌟' },
  ...LISTING_CATEGORIES,
];

export const DEFAULT_LISTING_CATEGORY = LISTING_CATEGORIES[0].id;

export function getCategoryLabel(categoryId?: string | null): string {
  if (!categoryId) return '二手樂器';
  const category = LISTING_CATEGORIES.find((item) => item.id === categoryId);
  return category?.name || '二手樂器';
}

export function getCategoryIcon(categoryId?: string | null): string {
  if (!categoryId) return '🎵';
  const category = LISTING_CATEGORIES.find((item) => item.id === categoryId);
  return category?.icon || '🎵';
}
