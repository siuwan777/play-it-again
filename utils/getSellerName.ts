import { User } from 'firebase/auth';
import { getAuthEmail } from './authSession';
import { getCachedDisplayName } from './userProfile';

export function getSellerName(user: User | null, fallbackEmail?: string | null): string {
  const customName = getCachedDisplayName();
  if (customName) return customName;

  const email =
    user?.email ||
    fallbackEmail ||
    getAuthEmail() ||
    user?.providerData?.[0]?.email ||
    null;

  if (user?.displayName?.trim()) {
    return user.displayName.trim();
  }

  if (email) {
    const localPart = email.split('@')[0]?.trim();
    if (localPart) return localPart;
  }

  if (user?.uid) {
    return `User_${user.uid.slice(0, 6)}`;
  }

  return '音樂愛好者';
}
