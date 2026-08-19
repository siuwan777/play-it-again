import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LISTING_CATEGORIES } from '../utils/listingCategories';

type ListingCategoryPickerProps = {
  value: string;
  onChange: (categoryId: string) => void;
};

export function ListingCategoryPicker({ value, onChange }: ListingCategoryPickerProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {LISTING_CATEGORIES.map((category) => {
          const selected = value === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => onChange(category.id)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 15 },
  scroll: { gap: 10 },
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
