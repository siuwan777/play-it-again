import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii } from '../constants/theme';
import { getIdentityBadgeLabel } from '../utils/profileCompleteness';
import { formatAvgRating } from '../utils/transactionRating';

export type SellerIdentityCardData = {
  displayName: string;
  avatarUrl?: string | null;
  joinDate?: string;
  region?: string;
  primaryInstrument?: string;
  bio?: string;
  instagram?: string;
  musicLink?: string;
  completenessPercent?: number;
  creditScore?: number;
  avgRating?: number;
  ratingCount?: number;
};

type SellerIdentityCardProps = {
  seller: SellerIdentityCardData;
  sellerId?: string | null;
  onPressProfile?: () => void;
};

function bioSnippet(bio: string, max = 72): string {
  const trimmed = bio.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function SellerIdentityCard({ seller, sellerId, onPressProfile }: SellerIdentityCardProps) {
  const canOpenProfile = Boolean(sellerId && onPressProfile);
  const ratingLine =
    (seller.ratingCount ?? 0) > 0
      ? `平均 ${formatAvgRating(seller.avgRating ?? 0, seller.ratingCount ?? 0)} (${seller.ratingCount} 則評價)`
      : '尚無評價';

  const metaParts = [
    seller.region?.trim(),
    seller.primaryInstrument?.trim(),
    seller.joinDate ? `加入 ${seller.joinDate}` : null,
  ].filter(Boolean);

  const identityLabel =
    typeof seller.completenessPercent === 'number'
      ? getIdentityBadgeLabel(seller.completenessPercent)
      : null;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={canOpenProfile ? 0.85 : 1}
      onPress={canOpenProfile ? onPressProfile : undefined}
      disabled={!canOpenProfile}
    >
      <View style={styles.topRow}>
        {seller.avatarUrl ? (
          <Image source={{ uri: seller.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{seller.displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.main}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {seller.displayName}
            </Text>
            {identityLabel ? (
              <View style={styles.completeBadge}>
                <Text style={styles.completeBadgeText}>{identityLabel}</Text>
              </View>
            ) : typeof seller.completenessPercent === 'number' ? (
              <View style={styles.percentBadge}>
                <Text style={styles.percentBadgeText}>檔案 {seller.completenessPercent}%</Text>
              </View>
            ) : null}
          </View>
          {metaParts.length > 0 ? (
            <Text style={styles.meta} numberOfLines={2}>
              {metaParts.join(' · ')}
            </Text>
          ) : null}
          <Text style={styles.stats}>
            信用分 {seller.creditScore ?? 0} · {ratingLine}
          </Text>
        </View>
        {canOpenProfile ? (
          <View style={styles.chevronWrap}>
            <Text style={styles.chevron}>›</Text>
          </View>
        ) : null}
      </View>

      {seller.bio?.trim() ? (
        <Text style={styles.bio}>{bioSnippet(seller.bio)}</Text>
      ) : (
        <Text style={styles.bioPlaceholder}>賣家尚未填寫簡介</Text>
      )}

      <View style={styles.linkRow}>
        {seller.instagram?.trim() ? (
          <Text style={styles.linkChip} numberOfLines={1}>
            IG {seller.instagram.trim()}
          </Text>
        ) : null}
        {seller.musicLink?.trim() ? (
          <Text style={styles.linkChip} numberOfLines={1}>
            音樂連結
          </Text>
        ) : null}
      </View>

      {canOpenProfile ? <Text style={styles.tapHint}>查看放售人檔案</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    padding: 16,
    borderRadius: radii.lg,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.mutedFill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: colors.mutedFill,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.text },
  main: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '800', color: colors.text, flexShrink: 1 },
  completeBadge: {
    backgroundColor: colors.tile,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  completeBadgeText: { fontSize: 10, fontWeight: '800', color: colors.textOnTile },
  percentBadge: {
    backgroundColor: colors.mutedFill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  percentBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  meta: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  stats: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chevronWrap: { paddingLeft: 4, paddingTop: 4 },
  chevron: { fontSize: 22, color: colors.textMuted, fontWeight: '300' },
  bio: { fontSize: 14, color: colors.text, lineHeight: 21, marginTop: 12 },
  bioPlaceholder: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', marginTop: 12 },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  linkChip: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    backgroundColor: colors.mutedFill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    maxWidth: '100%',
  },
  tapHint: { fontSize: 11, color: colors.textMuted, marginTop: 10, fontWeight: '600' },
});
