import { useEffect, useMemo, useRef, useState } from 'react';
import { getSellerPublicProfile } from '../utils/sellerProfile';

export type SellerPublicMeta = {
  completenessPercent: number;
  avatarUrl: string | null;
  region: string;
};

export function useSellerPublicMeta(userIds: string[]): Record<string, SellerPublicMeta> {
  const [metaByUserId, setMetaByUserId] = useState<Record<string, SellerPublicMeta>>({});
  const fetchedRef = useRef<Set<string>>(new Set());
  const idsKey = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(','),
    [userIds]
  );

  useEffect(() => {
    const uniqueIds = idsKey ? idsKey.split(',') : [];
    const missing = uniqueIds.filter((id) => !fetchedRef.current.has(id));
    if (!missing.length) return;

    missing.forEach((id) => fetchedRef.current.add(id));

    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        missing.map(async (userId) => {
          try {
            const profile = await getSellerPublicProfile(userId);
            if (!profile) return null;
            return [
              userId,
              {
                completenessPercent: profile.completenessPercent,
                avatarUrl: profile.avatarUrl,
                region: profile.region,
              },
            ] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const patch: Record<string, SellerPublicMeta> = {};
      for (const entry of entries) {
        if (entry) patch[entry[0]] = entry[1];
      }

      if (Object.keys(patch).length > 0) {
        setMetaByUserId((prev) => ({ ...prev, ...patch }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  return metaByUserId;
}
