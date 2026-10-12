import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { chipStyles } from '../constants/chipStyles';
import {
  fieldSupportsOther,
  getCustomFieldKey,
  getOtherOptionLabel,
  getSpecFields,
  isTextInputField,
  resolveSpecValue,
  YEAR_UNCERTAIN,
  type ListingSpecs,
  type SpecField,
} from '../utils/listingSpecs';
import { LISTING_CATEGORIES } from '../utils/listingCategories';
import { colors } from '../constants/theme';
import { CollapsibleFieldSection } from './CollapsibleFieldSection';
import { ListingCategoryPicker } from './ListingCategoryPicker';
import { OptionSelectField } from './OptionSelectField';

type ListingSpecFormProps = {
  categoryId: string;
  specs: ListingSpecs;
  onChange: (nextSpecs: ListingSpecs) => void;
  onCategoryChange?: (categoryId: string) => void;
  hideCategoryPicker?: boolean;
};

function getFieldSummary(field: SpecField, specs: ListingSpecs): string {
  if (isTextInputField(field)) {
    return specs[field.key]?.trim() || '請填寫';
  }

  const raw = specs[field.key]?.trim();
  if (raw === getOtherOptionLabel()) {
    const custom = specs[getCustomFieldKey(field.key)]?.trim();
    return custom || '請填寫';
  }

  const resolved = resolveSpecValue(specs, field.key);
  return resolved || '請選擇';
}

function renderOtherInput(
  field: SpecField,
  specs: ListingSpecs,
  onChangeCustom: (fieldKey: string, value: string) => void
) {
  const selectedValue = specs[field.key] || '';
  if (selectedValue !== getOtherOptionLabel() || !fieldSupportsOther(field)) {
    return null;
  }

  const customKey = getCustomFieldKey(field.key);

  return (
    <View style={styles.textFieldWrap}>
      <Text style={styles.inlineLabel}>
        {field.label}（其他）
        {field.required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.input}
        placeholder={`請填寫${field.label}`}
        placeholderTextColor="#8A7B72"
        value={specs[customKey] || ''}
        onChangeText={(value) => onChangeCustom(field.key, value)}
      />
    </View>
  );
}

export function ListingSpecForm({
  categoryId,
  specs,
  onChange,
  onCategoryChange,
  hideCategoryPicker = false,
}: ListingSpecFormProps) {
  const fields = getSpecFields(categoryId);
  const otherLabel = getOtherOptionLabel();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const categoryLabel =
    LISTING_CATEGORIES.find((item) => item.id === categoryId)?.name || '請選擇';

  useEffect(() => {
    setExpandedKey(null);
  }, [categoryId]);

  const toggleField = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  const collapseAfterSelect = () => {
    setExpandedKey(null);
  };

  const updateField = (key: string, value: string) => {
    const nextSpecs = { ...specs, [key]: value };

    if (value !== otherLabel) {
      nextSpecs[getCustomFieldKey(key)] = '';
    }

    onChange(nextSpecs);
    if (value !== otherLabel) {
      collapseAfterSelect();
    } else {
      setExpandedKey(key);
    }
  };

  const updateCustomField = (fieldKey: string, value: string) => {
    onChange({
      ...specs,
      [getCustomFieldKey(fieldKey)]: value,
    });
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionTitle}>商品規格</Text>
      <Text style={styles.sectionHint}>
        {categoryId === 'other' ? '請填寫商品規格' : '點開各項選擇；選「其他」時可填寫自訂內容'}
      </Text>

      {hideCategoryPicker ? null : (
        <CollapsibleFieldSection
          title="商品分類"
          summary={categoryLabel}
          required
          expanded={expandedKey === 'category'}
          onToggle={() => toggleField('category')}
        >
          <ListingCategoryPicker
            value={categoryId}
            onChange={(nextCategory) => {
              onCategoryChange?.(nextCategory);
              setExpandedKey(null);
            }}
          />
        </CollapsibleFieldSection>
      )}

      {fields.map((field) => {
        const summary = getFieldSummary(field, specs);
        const expanded = expandedKey === field.key;

        if (isTextInputField(field)) {
          if (field.key === 'year') {
            const yearUncertain = specs.year === YEAR_UNCERTAIN;
            return (
              <CollapsibleFieldSection
                key={field.key}
                title={field.label}
                summary={summary}
                required={field.required}
                expanded={expanded}
                onToggle={() => toggleField(field.key)}
              >
                <TextInput
                  style={[styles.input, yearUncertain && styles.inputMuted]}
                  placeholder={field.placeholder}
                  placeholderTextColor="#8A7B72"
                  editable={!yearUncertain}
                  value={yearUncertain ? '' : specs.year || ''}
                  onChangeText={(value) => onChange({ ...specs, year: value })}
                  keyboardType="default"
                />
                <TouchableOpacity
                  style={[chipStyles.chip, styles.yearChip, yearUncertain && chipStyles.chipActive]}
                  onPress={() => {
                    if (yearUncertain) {
                      onChange({ ...specs, year: '' });
                    } else {
                      onChange({ ...specs, year: YEAR_UNCERTAIN });
                      setExpandedKey(null);
                    }
                  }}
                >
                  <Text style={[chipStyles.chipText, yearUncertain && chipStyles.chipTextActive]}>
                    {YEAR_UNCERTAIN}
                  </Text>
                </TouchableOpacity>
              </CollapsibleFieldSection>
            );
          }

          return (
            <CollapsibleFieldSection
              key={field.key}
              title={field.label}
              summary={summary}
              required={field.required}
              expanded={expanded}
              onToggle={() => toggleField(field.key)}
            >
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor="#8A7B72"
                value={specs[field.key] || ''}
                onChangeText={(value) => onChange({ ...specs, [field.key]: value })}
              />
            </CollapsibleFieldSection>
          );
        }

        if (!field.options?.length) return null;

        return (
          <CollapsibleFieldSection
            key={field.key}
            title={field.label}
            summary={summary}
            required={field.required}
            expanded={expanded}
            onToggle={() => toggleField(field.key)}
          >
            <OptionSelectField
              label={field.label}
              value={specs[field.key] || ''}
              options={field.options}
              required={field.required}
              hideLabel
              onChange={(value) => updateField(field.key, value)}
            />
            {renderOtherInput(field, specs, updateCustomField)}
          </CollapsibleFieldSection>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  textFieldWrap: { marginTop: 12 },
  inlineLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  required: { color: colors.text },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
  },
  inputMuted: {
    backgroundColor: colors.mutedFill,
    color: colors.textMuted,
  },
  yearChip: { alignSelf: 'flex-start' },
});
