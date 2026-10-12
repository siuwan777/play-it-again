import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../constants/theme';
import type { IdentityBadgeLabel } from '../utils/profileCompleteness';

type ListingSignalBadgesProps = {
  hasDemoVideo?: boolean;
  hasCompleteSpecs?: boolean;
  identityLabel?: IdentityBadgeLabel | null;
};

export function ListingSignalBadges({
  hasDemoVideo,
  hasCompleteSpecs,
  identityLabel,
}: ListingSignalBadgesProps) {
  if (!hasDemoVideo && !hasCompleteSpecs && !identityLabel) return null;

  return (
    <View style={styles.row}>
      {hasDemoVideo ? (
        <View style={[styles.badge, styles.emphasis]}>
          <Text style={styles.emphasisText}>有試音</Text>
        </View>
      ) : null}
      {hasCompleteSpecs ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>規格齊</Text>
        </View>
      ) : null}
      {identityLabel ? (
        <View style={[styles.badge, identityLabel === '可核對身份' && styles.emphasis]}>
          <Text style={identityLabel === '可核對身份' ? styles.emphasisText : styles.badgeText}>
            {identityLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: colors.mutedFill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  emphasis: {
    backgroundColor: colors.tile,
    borderColor: colors.tile,
  },
  emphasisText: { fontSize: 10, fontWeight: '700', color: colors.textOnTile },
});
