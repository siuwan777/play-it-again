import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, radii } from '../constants/theme';
import {
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
  extractYouTubeVideoId,
} from '../utils/parseVideoLink';

type ListingVideoPlayerProps = {
  videoUrl: string;
  compact?: boolean;
};

export function ListingVideoPlayer({ videoUrl, compact = true }: ListingVideoPlayerProps) {
  const [playerActive, setPlayerActive] = useState(false);
  const youtubeId = useMemo(() => extractYouTubeVideoId(videoUrl), [videoUrl]);
  const embedUrl = useMemo(() => (youtubeId ? buildYouTubeEmbedUrl(youtubeId) : null), [youtubeId]);
  const thumbnailUrl = useMemo(
    () => (youtubeId ? buildYouTubeThumbnailUrl(youtubeId) : null),
    [youtubeId]
  );

  const openExternal = () => {
    Linking.openURL(videoUrl.trim());
  };

  if (!embedUrl || !thumbnailUrl || !youtubeId) {
    return (
      <View style={styles.fallbackCard}>
        <Text style={styles.fallbackTitle}>試聽連結</Text>
        <Text style={styles.fallbackHint}>App 內嵌播放器目前支援 YouTube；此連結請用下方按鈕開啟。</Text>
        <TouchableOpacity style={styles.externalBtn} onPress={openExternal} activeOpacity={0.85}>
          <Text style={styles.externalBtnText}>在外部 App 開啟</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const playerHeight = compact ? 168 : 220;

  return (
    <View style={styles.wrap}>
      <Text style={styles.playerLabel}>試聽片段 · 可直接在 App 播放</Text>
      <View style={[styles.playerFrame, { height: playerHeight }]}>
        {playerActive ? (
          <WebView
            source={{ uri: embedUrl }}
            style={styles.webview}
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={Platform.OS === 'android'}
            setSupportMultipleWindows={false}
            originWhitelist={['https://*', 'http://*']}
          />
        ) : (
          <TouchableOpacity
            style={styles.posterTouch}
            activeOpacity={0.9}
            onPress={() => setPlayerActive(true)}
          >
            <Image source={{ uri: thumbnailUrl }} style={styles.posterImage} resizeMode="cover" />
            <View style={styles.posterOverlay}>
              <View style={styles.playCircle}>
                <Ionicons name="play" size={26} color={colors.textOnTile} style={styles.playIcon} />
              </View>
              <Text style={styles.posterHint}>點擊在 App 內試聽</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={openExternal} activeOpacity={0.7}>
        <Text style={styles.openExternalLink}>在 YouTube 開啟</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  playerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  playerFrame: {
    width: '100%',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: colors.border,
  },
  webview: { flex: 1, backgroundColor: '#111111' },
  posterTouch: { flex: 1, width: '100%', height: '100%' },
  posterImage: { width: '100%', height: '100%' },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { marginLeft: 3 },
  posterHint: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
  openExternalLink: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  fallbackCard: {
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  fallbackTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  fallbackHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 },
  externalBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tile,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  externalBtnText: { color: colors.textOnTile, fontSize: 13, fontWeight: '700' },
});
