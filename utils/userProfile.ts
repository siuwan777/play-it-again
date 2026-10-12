import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { ProfileCompletenessInput } from './profileCompleteness';

export type UserProfile = {
  email: string;
  displayName: string;
  bio?: string;
  instagram?: string;
  region?: string;
  primaryInstrument?: string;
  musicLink?: string;
  avatarUrl?: string;
  creditScore?: number;
  forumUnlocked?: boolean;
  expoPushTokens?: string[];
  pushUpdatedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

let cachedDisplayName: string | null = null;

export function getCachedDisplayName(): string | null {
  return cachedDisplayName;
}

export function setCachedDisplayName(name: string | null) {
  cachedDisplayName = name?.trim() || null;
}

export function resolveDisplayName(profile: UserProfile | null, email?: string | null): string {
  if (profile?.displayName?.trim()) {
    return profile.displayName.trim();
  }

  if (email) {
    const localPart = email.split('@')[0]?.trim();
    if (localPart) return localPart;
  }

  return '音樂愛好者';
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return null;

  const profile = snapshot.data() as UserProfile;
  setCachedDisplayName(profile.displayName);
  return profile;
}

export async function ensureUserProfile(uid: string, email: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const profile = snapshot.data() as UserProfile;
    setCachedDisplayName(profile.displayName);
    return profile;
  }

  const profile: UserProfile = {
    email,
    displayName: resolveDisplayName(null, email),
    bio: '',
    instagram: '',
    creditScore: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, profile);
  setCachedDisplayName(profile.displayName);
  return profile;
}

async function syncListingSellerNames(uid: string, displayName: string) {
  const listingsQuery = query(collection(db, 'guitars'), where('userId', '==', uid));
  const snapshot = await getDocs(listingsQuery);

  if (snapshot.empty) return;

  let batch = writeBatch(db);
  let operationCount = 0;

  for (const listingDoc of snapshot.docs) {
    batch.update(listingDoc.ref, { sellerName: displayName });
    operationCount++;

    if (operationCount >= 500) {
      await batch.commit();
      batch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  if (data.displayName) {
    setCachedDisplayName(data.displayName);
    await syncListingSellerNames(uid, data.displayName.trim());
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      const profile = snapshot.data() as UserProfile;
      setCachedDisplayName(profile.displayName);
      onData(profile);
    },
    (error) => onError?.(error)
  );
}

export function userProfileToCompletenessInput(
  profile: UserProfile | null | undefined
): ProfileCompletenessInput {
  if (!profile) return {};
  return {
    avatarUrl: profile.avatarUrl ?? null,
    bio: profile.bio,
    instagram: profile.instagram,
    region: profile.region,
    primaryInstrument: profile.primaryInstrument,
    musicLink: profile.musicLink,
  };
}

export async function getDisplayNameForUser(uid: string, email?: string | null): Promise<string> {
  const profile = await getUserProfile(uid);
  if (profile) return resolveDisplayName(profile, email);

  if (email) {
    return (await ensureUserProfile(uid, email)).displayName;
  }

  return getCachedDisplayName() || '音樂愛好者';
}
