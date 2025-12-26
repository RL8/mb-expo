import { useState, useMemo, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, useWindowDimensions, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import squarify from 'squarify';
import { useDataStore, albumToSlug } from '../stores/dataStore';
import { colors } from '../lib/theme';
import AnimatedTile from '../components/AnimatedTile';
import LegacyAnimatedTile from '../components/LegacyAnimatedTile';
import { GestureCoachOnboarding, useGestureCoach } from '../components/LottieGestureCoach';

const DEMO_METRICS = [
  { key: 'default', label: 'Default' },
  { key: 'songCount', label: 'Songs' },
  { key: 'totalMinutes', label: 'Minutes' },
  { key: 'avgEnergy', label: 'Energy' },
];

const IMPLEMENTATIONS = [
  { key: 'legacy', label: 'Legacy', description: 'Basic Animated API - no feedback' },
  { key: 'enhanced', label: 'Enhanced', description: 'Reanimated + haptics + gestures' },
];

export default function CompareScreen() {
  const router = useRouter();
  const { albums, songs, isLoading, loadData } = useDataStore();
  const [implementation, setImplementation] = useState('legacy');
  const [selectedMetric, setSelectedMetric] = useState('default');
  const [sortBy, setSortBy] = useState('date');
  const [refreshKey, setRefreshKey] = useState(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Gesture coach state
  const [showGestureCoach, setShowGestureCoach] = useState(false);

  const padding = 16;
  const headerHeight = 180;
  const treemapWidth = windowWidth - (padding * 2);
  const treemapHeight = Math.max(windowHeight - headerHeight - 60, 300);

  useEffect(() => {
    loadData();
  }, []);

  const getMetricValue = (item) => item[selectedMetric] || 0;

  // Treemap data calculation
  const treemapData = useMemo(() => {
    if (treemapWidth <= 0 || treemapHeight <= 0 || albums.length === 0) return [];

    let sortedAlbums = [...albums];
    if (sortBy === 'date') {
      sortedAlbums.sort((a, b) => new Date(a.official_release_date) - new Date(b.official_release_date));
    } else if (sortBy === 'value' && selectedMetric !== 'default') {
      sortedAlbums.sort((a, b) => getMetricValue(b) - getMetricValue(a));
    }

    const data = sortedAlbums.map(album => ({
      id: album.id,
      name: album.display_name,
      slug: albumToSlug(album),
      value: selectedMetric === 'default' ? 100 : Math.max(getMetricValue(album) || 1, 1),
      color: album.color || colors.fallback,
      metricValue: getMetricValue(album),
    }));

    const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
    return squarify(data, container);
  }, [albums, selectedMetric, sortBy, treemapWidth, treemapHeight]);

  // Force re-mount when switching implementations
  const handleImplementationChange = useCallback((key) => {
    setImplementation(key);
    setRefreshKey(prev => prev + 1);
  }, []);

  // Handle metric change
  const handleMetricChange = useCallback((key) => {
    setSelectedMetric(key);
    setSortBy(key === 'default' ? 'date' : 'value');
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  const currentImpl = IMPLEMENTATIONS.find(i => i.key === implementation);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingHorizontal: padding }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>← Back</Text>
            </Pressable>
            <Text style={styles.title}>Animation Comparison</Text>
          </View>

          {/* Implementation toggle */}
          <View style={styles.toggleRow}>
            {IMPLEMENTATIONS.map(impl => (
              <Pressable
                key={impl.key}
                style={[styles.toggleBtn, implementation === impl.key && styles.toggleBtnActive]}
                onPress={() => handleImplementationChange(impl.key)}
              >
                <Text style={[styles.toggleBtnText, implementation === impl.key && styles.toggleBtnTextActive]}>
                  {impl.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Description */}
          <View style={styles.descriptionRow}>
            <Text style={styles.descriptionText}>{currentImpl?.description}</Text>
            <View style={styles.actionBtns}>
              <Pressable style={styles.refreshBtn} onPress={() => setShowGestureCoach(true)}>
                <Text style={styles.refreshBtnText}>👆 Tutorial</Text>
              </Pressable>
              <Pressable style={styles.refreshBtn} onPress={() => setRefreshKey(prev => prev + 1)}>
                <Text style={styles.refreshBtnText}>↻ Replay</Text>
              </Pressable>
            </View>
          </View>

          {/* Metric buttons */}
          <View style={styles.metricRow}>
            {DEMO_METRICS.map(metric => (
              <Pressable
                key={metric.key}
                style={[styles.metricBtn, selectedMetric === metric.key && styles.metricBtnActive]}
                onPress={() => handleMetricChange(metric.key)}
              >
                <Text style={[styles.metricBtnText, selectedMetric === metric.key && styles.metricBtnTextActive]}>
                  {metric.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Treemap */}
        <View style={[styles.treemapContainer, { width: treemapWidth, height: treemapHeight }]}>
          {implementation === 'legacy' ? (
            treemapData.map((item, index) => (
              <LegacyAnimatedTile
                key={`legacy-${item.id}-${refreshKey}`}
                item={item}
                metric={DEMO_METRICS.find(m => m.key === selectedMetric)}
                suffix=""
                isSmall={false}
                index={index}
                showOrder={sortBy === 'value' && selectedMetric !== 'default'}
                onPress={() => router.push(`/album/${item.slug}`)}
              />
            ))
          ) : (
            treemapData.map((item, index) => (
              <AnimatedTile
                key={`enhanced-${item.id}-${refreshKey}`}
                item={item}
                metric={DEMO_METRICS.find(m => m.key === selectedMetric)}
                suffix=""
                isSmall={false}
                index={index}
                showOrder={sortBy === 'value' && selectedMetric !== 'default'}
                onPress={() => router.push(`/album/${item.slug}`)}
              />
            ))
          )}
        </View>

        {/* Footer with feature summary */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {implementation === 'legacy'
              ? 'JS THREAD · NO HAPTICS · BASIC SPRINGS'
              : 'NATIVE THREAD · HAPTICS · GESTURE HANDLER · ZOOM IN/OUT'}
          </Text>
        </View>
      </View>

      {/* Lottie Gesture Coach */}
      <GestureCoachOnboarding
        visible={showGestureCoach}
        onComplete={() => setShowGestureCoach(false)}
      />

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.text.muted,
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
  },
  header: {
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    marginRight: 12,
  },
  backBtnText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  title: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_800ExtraBold',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface.medium,
    borderWidth: 2,
    borderColor: colors.border.subtle,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.accent.primaryMuted,
    borderColor: colors.accent.primary,
  },
  toggleBtnText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleBtnTextActive: {
    color: colors.accent.primary,
  },
  descriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  descriptionText: {
    color: colors.text.muted,
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    fontStyle: 'italic',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface.medium,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  refreshBtnText: {
    color: colors.accent.primary,
    fontSize: 11,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.surface.medium,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  metricBtnActive: {
    backgroundColor: colors.accent.primaryMuted,
    borderColor: colors.accent.primaryBorder,
  },
  metricBtnText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricBtnTextActive: {
    color: colors.accent.primary,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  treemapContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});
