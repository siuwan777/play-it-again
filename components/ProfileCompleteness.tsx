import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../constants/theme';
import {
  getProfileCompleteness,
  getProfileCompletenessRewardHint,
  PROFILE_BIO_MIN_LENGTH,
  type ProfileCompletenessInput,
} from '../utils/profileCompleteness';

type ProfileCompletenessProps = ProfileCompletenessInput & {
  variant: 'summary' | 'checklist';
  bioCharCount?: number;
};

export function ProfileCompleteness(props: ProfileCompletenessProps) {
  const { variant, bioCharCount, ...input } = props;
  const { percent, items, isComplete } = getProfileCompleteness(input);

  if (variant === 'summary') {
    return (
      <View style={styles.summaryWrap}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>檔案完整度</Text>
          <Text style={[styles.summaryPercent, isComplete && styles.summaryPercentDone]}>
            {percent}%
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.summaryHint}>{getProfileCompletenessRewardHint(percent, isComplete)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.checklistWrap}>
      <View style={styles.summaryHeader}>
        <Text style={styles.checklistTitle}>檔案完整度</Text>
        <Text style={[styles.summaryPercent, isComplete && styles.summaryPercentDone]}>
          {percent}%
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.summaryHint}>{getProfileCompletenessRewardHint(percent, isComplete)}</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.checkRow}>
          <View style={[styles.checkIcon, item.done && styles.checkIconDone]}>
            <Text style={[styles.checkIconText, item.done && styles.checkIconTextDone]}>
              {item.done ? '✓' : '○'}
            </Text>
          </View>
          <View style={styles.checkBody}>
            <Text style={[styles.checkLabel, item.done && styles.checkLabelDone]}>{item.label}</Text>
            {!item.done ? <Text style={styles.checkHint}>{item.hint}</Text> : null}
            {item.id === 'bio' && typeof bioCharCount === 'number' ? (
              <Text
                style={[
                  styles.bioCount,
                  bioCharCount >= PROFILE_BIO_MIN_LENGTH ? styles.bioCountOk : styles.bioCountLow,
                ]}
              >
                {bioCharCount} / {PROFILE_BIO_MIN_LENGTH} 字
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryWrap: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: colors.mutedFill,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checklistWrap: {
    marginBottom: 20,
    padding: 14,
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  checklistTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  summaryPercent: { fontSize: 16, fontWeight: '800', color: colors.textSecondary },
  summaryPercentDone: { color: colors.text },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: {
    height: '100%',
    backgroundColor: colors.tile,
    borderRadius: 4,
  },
  summaryHint: { fontSize: 12, lineHeight: 18, color: colors.textSecondary },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, gap: 10 },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkIconDone: { backgroundColor: colors.tile, borderColor: colors.tile },
  checkIconText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  checkIconTextDone: { color: colors.textOnTile },
  checkBody: { flex: 1 },
  checkLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  checkLabelDone: { color: colors.textSecondary },
  checkHint: { fontSize: 12, lineHeight: 17, color: colors.textMuted, marginTop: 2 },
  bioCount: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  bioCountLow: { color: colors.textMuted },
  bioCountOk: { color: colors.textSecondary },
});
