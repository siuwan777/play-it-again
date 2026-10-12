export const PROFILE_REGION_GROUPS: { title: string; options: string[] }[] = [
  { title: '港島', options: ['中西區', '灣仔區', '東區', '南區'] },
  { title: '九龍', options: ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區'] },
  {
    title: '新界／離島',
    options: ['荃灣區', '葵青區', '沙田區', '大埔區', '北區', '西貢區', '屯門區', '元朗區', '離島區'],
  },
];

export const PROFILE_REGION_OPTIONS = PROFILE_REGION_GROUPS.flatMap((group) => group.options);

const REGION_OPTION_SET = new Set(PROFILE_REGION_OPTIONS);

export function parseRegions(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function composeRegions(selected: string[]): string {
  const known = PROFILE_REGION_OPTIONS.filter((item) => selected.includes(item));
  const extra = selected.filter((item) => !REGION_OPTION_SET.has(item));
  return [...known, ...extra].join('、');
}

export function formatRegionSummary(selected: string[]): string {
  if (selected.length === 0) return '請選擇';
  if (selected.length === 1) return selected[0];
  return `已選 ${selected.length} 個地區`;
}

export const PROFILE_INSTRUMENT_OTHER = '其他';

export const PROFILE_INSTRUMENT_OPTIONS = [
  'Bass',
  '結他 / 電結他',
  '鼓',
  '琴 / Keyboard',
  '管樂 / 弦樂',
  PROFILE_INSTRUMENT_OTHER,
] as const;

export type ProfileRegion = string;
export type ProfileInstrument = (typeof PROFILE_INSTRUMENT_OPTIONS)[number];

const INSTRUMENT_PRESETS: readonly string[] = PROFILE_INSTRUMENT_OPTIONS.filter(
  (item) => item !== PROFILE_INSTRUMENT_OTHER
);

export function resolveInstrumentChoice(value?: string): { choice: string; custom: string } {
  const trimmed = value?.trim() || '';
  if (!trimmed) return { choice: '', custom: '' };
  if (INSTRUMENT_PRESETS.includes(trimmed)) {
    return { choice: trimmed, custom: '' };
  }
  return {
    choice: PROFILE_INSTRUMENT_OTHER,
    custom: trimmed === PROFILE_INSTRUMENT_OTHER ? '' : trimmed,
  };
}

export function composeInstrumentValue(choice: string, custom: string): string {
  if (choice !== PROFILE_INSTRUMENT_OTHER) return choice.trim();
  return custom.trim() || PROFILE_INSTRUMENT_OTHER;
}
