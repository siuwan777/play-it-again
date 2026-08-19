import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SelectOption = string | { value: string; label: string };

type OptionSelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  required?: boolean;
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
  onChange,
}: OptionSelectFieldProps) {
  const normalizedOptions = options.map(normalizeOption);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {normalizedOptions.map((option) => {
          const selected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8 },
  required: { color: '#C35A2C' },
  scroll: { gap: 10, paddingBottom: 8 },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0D8C8',
  },
  chipActive: {
    backgroundColor: '#4A3B32',
    borderColor: '#4A3B32',
  },
  chipText: {
    fontSize: 14,
    color: '#4A3B32',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#F4EEDD',
  },
});
