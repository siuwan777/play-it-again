import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const RATING_CREDIT_REWARD = 50;

export type TransactionRating = {
  listingId: string;
  listingTitle: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  rating: number;
  tags: string[];
  comment: string;
  createdAt?: unknown;
};

export type RevieweeStats = {
  avgRating: number;
  ratingCount: number;
  creditScore: number;
};

export function buildRatingId(listingId: string, reviewerId: string): string {
  return `${listingId}_${reviewerId}`;
}

export async function getExistingRating(
  listingId: string,
  reviewerId: string
): Promise<TransactionRating | null> {
  const snapshot = await getDoc(doc(db, 'ratings', buildRatingId(listingId, reviewerId)));
  if (!snapshot.exists()) return null;
  return snapshot.data() as TransactionRating;
}

export async function submitTransactionRating(params: {
  listingId: string;
  listingTitle: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  rating: number;
  tags: string[];
  comment: string;
}): Promise<void> {
  if (params.rating < 1 || params.rating > 5) {
    throw new Error('評分必須為 1 至 5 星');
  }

  if (params.reviewerId === params.revieweeId) {
    throw new Error('無法為自己評分');
  }

  const ratingId = buildRatingId(params.listingId, params.reviewerId);
  const existing = await getDoc(doc(db, 'ratings', ratingId));
  if (existing.exists()) {
    throw new Error('你已為這次交易評过分');
  }

  const batch = writeBatch(db);

  batch.set(doc(db, 'ratings', ratingId), {
    listingId: params.listingId,
    listingTitle: params.listingTitle,
    reviewerId: params.reviewerId,
    revieweeId: params.revieweeId,
    revieweeName: params.revieweeName,
    rating: params.rating,
    tags: params.tags,
    comment: params.comment.trim(),
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'users', params.reviewerId), {
    creditScore: increment(RATING_CREDIT_REWARD),
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function getRevieweeStats(revieweeId: string): Promise<RevieweeStats> {
  const [profileSnap, ratingsSnap] = await Promise.all([
    getDoc(doc(db, 'users', revieweeId)),
    getDocs(query(collection(db, 'ratings'), where('revieweeId', '==', revieweeId))),
  ]);

  const profile = profileSnap.exists() ? profileSnap.data() : null;
  const ratings = ratingsSnap.docs.map((ratingDoc) => ratingDoc.data().rating as number);
  const ratingCount = ratings.length;
  const avgRating =
    ratingCount > 0 ? ratings.reduce((sum, value) => sum + value, 0) / ratingCount : 0;

  return {
    avgRating,
    ratingCount,
    creditScore: typeof profile?.creditScore === 'number' ? profile.creditScore : 0,
  };
}

export function formatAvgRating(avgRating: number, ratingCount: number): string {
  if (ratingCount === 0) return '—';
  return avgRating.toFixed(1);
}
