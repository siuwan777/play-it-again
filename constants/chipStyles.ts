import { StyleSheet } from 'react-native';
import { colors, radii } from './theme';

/** Shared horizontal chip picker (category, condition, specs) */
export const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.chipActiveBg,
    borderColor: colors.chipActiveBg,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.chipActiveText,
  },
});
