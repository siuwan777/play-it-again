import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../constants/theme';

type CollapsibleFieldSectionProps = {
  title: string;
  summary: string;
  required?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export function CollapsibleFieldSection({
  title,
  summary,
  required,
  expanded,
  onToggle,
  children,
}: CollapsibleFieldSectionProps) {
  const hasValue = summary.trim().length > 0 && summary !== '請選擇' && summary !== '請填寫';

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {title}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
          {!expanded ? (
            <Text style={[styles.summary, !hasValue && styles.summaryPlaceholder]} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </TouchableOpacity>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  required: { color: colors.text },
  summary: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  summaryPlaceholder: { color: colors.textMuted },
  body: { paddingHorizontal: 14, paddingBottom: 14 },
});
