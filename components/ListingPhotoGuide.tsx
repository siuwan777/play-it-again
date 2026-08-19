import { Image } from 'expo-image';
import React from 'react';
import { ImageSourcePropType, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>建議拍攝角度（Bass 示範）</Text>
      <Text style={styles.subtitle}>參考以下 Bass 拍攝角度，上傳你自己的真實照片即可</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D8C8',
    padding: 14,
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: '800', color: '#4A3B32', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#8A7B72', lineHeight: 16, marginBottom: 12 },
  scroll: { gap: 12, paddingBottom: 2 },
  card: { width: 96, alignItems: 'center' },
  preview: {
    width: 88,
    height: 96,
    borderRadius: 12,
    backgroundColor: '#F4EEDD',
    borderWidth: 1,
    borderColor: '#D8CEBC',
    overflow: 'hidden',
    marginBottom: 6,
  },
  photo: { width: '100%', height: '100%' },
  demoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(74, 59, 50, 0.8)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoBadgeText: { fontSize: 8, color: '#F4EEDD', fontWeight: '700' },
  cardLabel: { fontSize: 12, fontWeight: '800', color: '#4A3B32' },
  cardHint: { fontSize: 10, color: '#8A7B72', marginTop: 2, textAlign: 'center' },
});
