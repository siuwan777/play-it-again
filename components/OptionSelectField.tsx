import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { chipStyles } from '../constants/chipStyles';
import { colors } from '../constants/theme';

export type SelectOption = string | { value: string; label: string };

type OptionSelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  required?: boolean;
  hideLabel?: boolean;
  onChange: (value: string) => void;
};

function normalizeOption(option: SelectOption) {
  if (typeof option === 'string') {
    return { value: option, label: option };
  }
  return option;
}

export function OptionSelectField({
  label,
  value,
  options,
  required,
  hideLabel,
  onChange,
}: OptionSelectFieldProps) {
  const normalizedOptions = options.map(normalizeOption);

  return (
    <View style={[styles.container, hideLabel && styles.containerCompact]}>
      {hideLabel ? null : (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {normalizedOptions.map((option) => {
          const selected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[chipStyles.chip, selected && chipStyles.chipActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[chipStyles.chipText, selected && chipStyles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  containerCompact: { marginBottom: 0 },
  label: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  required: { color: colors.text },
  scroll: { gap: 10, paddingBottom: 8 },
});
