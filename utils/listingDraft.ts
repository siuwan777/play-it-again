import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebaseConfig';
import type { ListingSpecs } from './listingSpecs';

export type ListingDraft = {
  category: string;
  specs: ListingSpecs;
  conditionId: string;
  price: string;
  description: string;
  videoLink: string;
  imageUris: string[];
  savedAt: number;
};

const STORAGE_PREFIX = 'listing_draft_v1';

function getDraftStorageKey(): string {
  const uid = auth.currentUser?.uid;
  return uid ? `${STORAGE_PREFIX}_${uid}` : `${STORAGE_PREFIX}_guest`;
}

export function hasDraftContent(draft: Partial<ListingDraft>): boolean {
  if (draft.videoLink?.trim()) return true;
  if (draft.description?.trim()) return true;
  if (draft.price?.trim()) return true;
  if (draft.conditionId?.trim()) return true;
  if (draft.imageUris?.length) return true;
  if (draft.specs) {
    if (Object.values(draft.specs).some((value) => value?.trim())) return true;
  }
  return false;
}

export async function loadListingDraft(): Promise<ListingDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(getDraftStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListingDraft;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveListingDraft(
  draft: Omit<ListingDraft, 'savedAt'>
): Promise<void> {
  if (!hasDraftContent(draft)) {
    await clearListingDraft();
    return;
  }

  try {
    const payload: ListingDraft = { ...draft, savedAt: Date.now() };
    await AsyncStorage.setItem(getDraftStorageKey(), JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

export async function clearListingDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(getDraftStorageKey());
  } catch {
    // ignore
  }
}
