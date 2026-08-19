import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  fieldSupportsOther,
  getCustomFieldKey,
  getModelOptions,
  getOtherOptionLabel,
  getSpecFields,
  isTextInputField,
  type ListingSpecs,
  type SpecField,
} from '../utils/listingSpecs';
import { OptionSelectField } from './OptionSelectField';

type ListingSpecFormProps = {
  categoryId: string;
  specs: ListingSpecs;
  onChange: (nextSpecs: ListingSpecs) => void;
};

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
      <Text style={styles.label}>
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

export function ListingSpecForm({ categoryId, specs, onChange }: ListingSpecFormProps) {
  const fields = getSpecFields(categoryId);
  const otherLabel = getOtherOptionLabel();

  const updateField = (key: string, value: string) => {
    const nextSpecs = { ...specs, [key]: value };

    if (value !== otherLabel) {
      nextSpecs[getCustomFieldKey(key)] = '';
    }

    if (key === 'brand') {
      nextSpecs.model = '';
      nextSpecs.customModel = '';
    }

    onChange(nextSpecs);
  };

  const updateCustomField = (fieldKey: string, value: string) => {
    onChange({
      ...specs,
      [getCustomFieldKey(fieldKey)]: value,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>商品規格</Text>
      <Text style={styles.sectionHint}>
        {categoryId === 'other' ? '請填寫商品規格' : '選「其他」時可填寫自訂內容'}
      </Text>

      {fields.map((field) => {
        if (isTextInputField(field)) {
          return (
            <View key={field.key} style={styles.textFieldWrap}>
              <Text style={styles.label}>
                {field.label}
                {field.required ? <Text style={styles.required}> *</Text> : null}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor="#8A7B72"
                value={specs[field.key] || ''}
                onChangeText={(value) => updateField(field.key, value)}
              />
            </View>
          );
        }

        if (field.key === 'model') {
          return (
            <View key={field.key}>
              <OptionSelectField
                label={field.label}
                value={specs.model || ''}
                options={getModelOptions(specs.brand)}
                required={field.required}
                onChange={(value) => updateField('model', value)}
              />
              {renderOtherInput(field, specs, updateCustomField)}
            </View>
          );
        }

        if (!field.options?.length) return null;

        return (
          <View key={field.key}>
            <OptionSelectField
              label={field.label}
              value={specs[field.key] || ''}
              options={field.options}
              required={field.required}
              onChange={(value) => updateField(field.key, value)}
            />
            {renderOtherInput(field, specs, updateCustomField)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D8C8',
    padding: 16,
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#4A3B32', marginBottom: 4 },
  sectionHint: { fontSize: 12, color: '#8A7B72', marginBottom: 16, lineHeight: 18 },
  textFieldWrap: { marginBottom: 8 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#4A3B32', marginBottom: 8 },
  required: { color: '#C35A2C' },
  input: {
    backgroundColor: '#F4EEDD',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 8,
    color: '#4A3B32',
  },
});
