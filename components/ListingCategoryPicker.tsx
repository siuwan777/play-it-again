import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { chipStyles } from '../constants/chipStyles';
import { colors, radii } from '../constants/theme';
import { LISTING_CATEGORIES } from '../utils/listingCategories';

type ListingCategoryPickerProps = {
  value: string;
  onChange: (categoryId: string) => void;
  layout?: 'scroll' | 'wrap';
};

export function ListingCategoryPicker({
  value,
  onChange,
  layout = 'scroll',
}: ListingCategoryPickerProps) {
  if (layout === 'wrap') {
    return (
      <View style={styles.wrapGrid}>
        {LISTING_CATEGORIES.map((category) => {
          const selected = value === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[styles.wrapItem, selected && styles.wrapItemActive]}
              onPress={() => onChange(category.id)}
            >
              <Text style={[styles.wrapItemText, selected && styles.wrapItemTextActive]} numberOfLines={2}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {LISTING_CATEGORIES.map((category) => {
          const selected = value === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              style={[chipStyles.chip, selected && chipStyles.chipActive]}
              onPress={() => onChange(category.id)}
            >
              <Text style={[chipStyles.chipText, selected && chipStyles.chipTextActive]}>
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
  container: { marginBottom: 0 },
  scroll: { gap: 10 },
  wrapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wrapItem: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wrapItemActive: { backgroundColor: colors.tile, borderColor: colors.tile },
  wrapItemText: { fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center' },
  wrapItemTextActive: { color: colors.textOnTile },
});
