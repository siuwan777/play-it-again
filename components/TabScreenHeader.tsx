import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radii } from '../constants/theme';

export type TabScreenHeaderVariant = 'messages' | 'post' | 'profile';

type TabScreenHeaderProps = {
  variant: TabScreenHeaderVariant;
  title: string;
  subtitle?: string;
  tag?: string;
  style?: ViewStyle;
};

const VARIANT_CONFIG: Record<
  TabScreenHeaderVariant,
  { tag: string; backgroundColor: string; accentColor: string }
> = {
  messages: {
    tag: '訊息',
    backgroundColor: colors.tile,
    accentColor: 'rgba(255,255,255,0.35)',
  },
  post: {
    tag: '放售',
    backgroundColor: colors.tilePressed,
    accentColor: 'rgba(255,255,255,0.45)',
  },
  profile: {
    tag: '個人',
    backgroundColor: colors.tile,
    accentColor: 'rgba(255,255,255,0.35)',
  },
};

export function TabScreenHeader({ variant, title, subtitle, tag, style }: TabScreenHeaderProps) {
  const config = VARIANT_CONFIG[variant];
  const displayTag = tag ?? config.tag;

  return (
    <View style={[styles.wrap, { backgroundColor: config.backgroundColor }, style]}>
      <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />
      <Text style={styles.brandKicker}>Play it again</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.tagPill}>
          <Text style={styles.tagText}>{displayTag}</Text>
        </View>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  brandKicker: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: colors.textOnTile,
    letterSpacing: -0.4,
  },
  tagPill: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textOnTile,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.78)',
  },
});
