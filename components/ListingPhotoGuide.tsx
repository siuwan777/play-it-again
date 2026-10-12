import { Image } from 'expo-image';
import React, { useState } from 'react';
import { ImageSourcePropType, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { CollapsibleFieldSection } from './CollapsibleFieldSection';

type PhotoExample = {
  id: string;
  label: string;
  hint: string;
  source: ImageSourcePropType;
};

const PHOTO_EXAMPLES: PhotoExample[] = [
  {
    id: 'front',
    label: '正面',
    hint: '封面首選',
    source: require('../assets/listing-photo-guide/bass-front-demo.png'),
  },
  {
    id: 'side',
    label: '側面',
    hint: '厚度輪廓',
    source: require('../assets/listing-photo-guide/bass-side-demo.png'),
  },
  {
    id: 'back',
    label: '背面',
    hint: '序號 / 艙蓋',
    source: require('../assets/listing-photo-guide/bass-back-demo.png'),
  },
  {
    id: 'detail',
    label: '細節',
    hint: '指板 / 弦橋',
    source: require('../assets/listing-photo-guide/bass-detail-demo.png'),
  },
];

export function ListingPhotoGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <CollapsibleFieldSection
      title="建議拍攝角度"
      summary="點開查看示範"
      expanded={expanded}
      onToggle={() => setExpanded((prev) => !prev)}
    >
      <Text style={styles.subtitle}>參考以下樂器拍攝角度，上傳你自己的真實照片即可</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {PHOTO_EXAMPLES.map((example) => (
          <View key={example.id} style={styles.card}>
            <View style={styles.preview}>
              <Image source={example.source} style={styles.photo} contentFit="cover" />
              <View style={styles.demoBadge}>
                <Text style={styles.demoBadgeText}>示範</Text>
              </View>
            </View>
            <Text style={styles.cardLabel}>{example.label}</Text>
            <Text style={styles.cardHint}>{example.hint}</Text>
          </View>
        ))}
      </ScrollView>
    </CollapsibleFieldSection>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 11, color: colors.textMuted, lineHeight: 16, marginBottom: 12 },
  scroll: { gap: 12, paddingBottom: 2 },
  card: { width: 96, alignItems: 'center' },
  preview: {
    width: 88,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.tile,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 6,
  },
  photo: { width: '100%', height: '100%' },
  demoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoBadgeText: { fontSize: 8, color: colors.onPrimary, fontWeight: '700' },
  cardLabel: { fontSize: 12, fontWeight: '800', color: colors.text },
  cardHint: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
});
