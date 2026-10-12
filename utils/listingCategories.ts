export type ListingCategory = {
  id: string;
  name: string;
};

export const LISTING_CATEGORIES: ListingCategory[] = [
  { id: 'eguitar', name: '電結他' },
  { id: 'aguitar', name: '木結他' },
  { id: 'bass', name: '低音結他' },
  { id: 'ukulele', name: '烏克麗麗' },
  { id: 'keyboard', name: '鍵琴' },
  { id: 'winds', name: '管樂' },
  { id: 'strings', name: '弦樂' },
  { id: 'effects', name: '效果器' },
  { id: 'amps', name: '功放 (Amp)' },
  { id: 'drums', name: '鼓組' },
  { id: 'mic', name: '咪 / 錄音' },
  { id: 'dj', name: 'DJ 器材' },
  { id: 'other', name: '其他' },
];

export const MARKETPLACE_CATEGORIES: ListingCategory[] = [
  { id: 'all', name: '全部' },
  ...LISTING_CATEGORIES,
];

export const DEFAULT_LISTING_CATEGORY = LISTING_CATEGORIES[0].id;
export const UNSELECTED_LISTING_CATEGORY = '';

export function getCategoryLabel(categoryId?: string | null): string {
  if (!categoryId) return '二手樂器';
  const category = LISTING_CATEGORIES.find((item) => item.id === categoryId);
  return category?.name || '二手樂器';
}
