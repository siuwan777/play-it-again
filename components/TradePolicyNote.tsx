import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../constants/theme';
import {
  TRADE_POLICY_SHORT,
  TRADE_POLICY_TEXT,
  TRADE_POLICY_TITLE,
  TRADE_SAFETY_TEXT,
} from '../utils/tradePolicy';

type TradePolicyNoteProps = {
  variant?: 'box' | 'compact';
  showSafetyTip?: boolean;
};

export function TradePolicyNote({
  variant = 'box',
  showSafetyTip = false,
}: TradePolicyNoteProps) {
  if (variant === 'compact') {
    return (
      <View style={styles.compact}>
        <Text style={styles.compactText}>{TRADE_POLICY_SHORT}</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{TRADE_POLICY_TITLE}</Text>
      <Text style={styles.body}>{TRADE_POLICY_TEXT}</Text>
      {showSafetyTip ? <Text style={styles.tip}>{TRADE_SAFETY_TEXT}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.mutedFill,
    padding: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  body: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  tip: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 8 },
  compact: {
    backgroundColor: colors.mutedFill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compactText: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
});
