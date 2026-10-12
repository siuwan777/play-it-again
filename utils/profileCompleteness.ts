export const PROFILE_BIO_MIN_LENGTH = 30;
export const PROFILE_NUDGE_MIN_PERCENT = 60;
/** 商品卡顯示地區 */
export const PROFILE_REGION_VISIBLE_PERCENT = 50;
/** 「身份較齊」標籤與「較可信賣家」篩選 */
export const PROFILE_TRUSTED_BADGE_PERCENT = 67;
/** 「可核對身份」標籤與市集「值得聯絡」 */
export const PROFILE_VERIFIABLE_PERCENT = 100;
export const PROFILE_LISTING_COMPLETE_PERCENT = PROFILE_VERIFIABLE_PERCENT;

export type ProfileCompletenessItemId =
  | 'avatar'
  | 'bio'
  | 'instagram'
  | 'region'
  | 'primaryInstrument'
  | 'musicLink';

export type ProfileCompletenessItem = {
  id: ProfileCompletenessItemId;
  label: string;
  hint: string;
  done: boolean;
};

export type ProfileCompleteness = {
  percent: number;
  items: ProfileCompletenessItem[];
  isComplete: boolean;
};

export type ProfileCompletenessInput = {
  avatarUrl?: string | null;
  bio?: string;
  instagram?: string;
  region?: string;
  primaryInstrument?: string;
  musicLink?: string;
};

function hasAvatar(avatarUrl?: string | null): boolean {
  return typeof avatarUrl === 'string' && avatarUrl.trim().length > 0;
}

function hasBio(bio?: string): boolean {
  return (bio?.trim().length ?? 0) >= PROFILE_BIO_MIN_LENGTH;
}

function hasInstagram(instagram?: string): boolean {
  const handle = instagram?.trim().replace(/^@+/, '') ?? '';
  return handle.length >= 1;
}

function hasRegion(region?: string): boolean {
  return (region?.trim().length ?? 0) >= 1;
}

function hasPrimaryInstrument(primaryInstrument?: string): boolean {
  return (primaryInstrument?.trim().length ?? 0) >= 1;
}

function hasMusicLink(musicLink?: string): boolean {
  const link = musicLink?.trim() ?? '';
  return link.length >= 8;
}

export function getProfileCompleteness(input: ProfileCompletenessInput): ProfileCompleteness {
  const items: ProfileCompletenessItem[] = [
    {
      id: 'avatar',
      label: '上傳頭像',
      hint: '用真實或清晰個人照，買家更易認得你',
      done: hasAvatar(input.avatarUrl),
    },
    {
      id: 'bio',
      label: `填寫個人簡介（至少 ${PROFILE_BIO_MIN_LENGTH} 字）`,
      hint: '例如玩咩樂器、年資、地區、演出經驗',
      done: hasBio(input.bio),
    },
    {
      id: 'instagram',
      label: '連結 Instagram',
      hint: '讓買家可在站外核對你的身份',
      done: hasInstagram(input.instagram),
    },
    {
      id: 'region',
      label: '選擇常出沒地區',
      hint: '可選多區，方便買家估計面交位置（唔會顯示詳細地址）',
      done: hasRegion(input.region),
    },
    {
      id: 'primaryInstrument',
      label: '填寫主要樂器',
      hint: '讓買家知道你主要彈／用邊種樂器',
      done: hasPrimaryInstrument(input.primaryInstrument),
    },
    {
      id: 'musicLink',
      label: '加入音樂連結',
      hint: 'YouTube、Bandcamp 等可核對身份的連結',
      done: hasMusicLink(input.musicLink),
    },
  ];

  const doneCount = items.filter((item) => item.done).length;
  const percent = Math.round((doneCount / items.length) * 100);

  return {
    percent,
    items,
    isComplete: doneCount === items.length,
  };
}

export type IdentityBadgeLabel = '身份較齊' | '可核對身份';

export function getIdentityBadgeLabel(percent: number): IdentityBadgeLabel | null {
  if (percent >= PROFILE_VERIFIABLE_PERCENT) return '可核對身份';
  if (percent >= PROFILE_TRUSTED_BADGE_PERCENT) return '身份較齊';
  return null;
}

export function shouldShowSellerRegion(percent: number, region?: string | null): boolean {
  return percent >= PROFILE_REGION_VISIBLE_PERCENT && Boolean(region?.trim());
}

export function isTrustedSeller(percent: number): boolean {
  return percent >= PROFILE_TRUSTED_BADGE_PERCENT;
}

export function isVerifiableSeller(percent: number): boolean {
  return percent >= PROFILE_VERIFIABLE_PERCENT;
}

export function getProfileCompletenessRewardHint(percent: number, isComplete: boolean): string {
  if (isComplete) {
    return '檔案已完整：商品會標示「可核對身份」，並出現在市集「值得聯絡」。';
  }
  if (percent >= PROFILE_TRUSTED_BADGE_PERCENT) {
    return '已解鎖「身份較齊」。再補齊頭像、IG 或音樂連結，可進入「值得聯絡」。';
  }
  if (percent >= PROFILE_REGION_VISIBLE_PERCENT) {
    return '已解鎖在商品卡顯示地區。繼續填寫可獲得身份標籤，商品較易被買家看到。';
  }
  return '填好頭像、地區同對外連結，商品卡會顯示你的身份，買家更易聯絡。';
}
