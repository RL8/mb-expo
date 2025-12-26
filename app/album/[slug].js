import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, useWindowDimensions, SafeAreaView, Platform, ScrollView, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import squarify from 'squarify';
import { useDataStore } from '../../stores/dataStore';
import { colors } from '../../lib/theme';
import AnimatedTile from '../../components/AnimatedTile';

const METRIC_GROUPS = [
  {
    label: 'Basic',
    metrics: [
      { key: 'default', label: 'Default', suffix: '' },
      { key: 'totalMinutes', label: 'Minutes', suffix: ' min' },
      { key: 'words', label: 'Words', suffix: '', subModes: [
        { key: 'wordCount', subLabel: 'total' },
        { key: 'uniqueWordCount', subLabel: 'unique' },
        { key: 'vocabularyRichness', subLabel: 'vocabulary %', suffix: '%' },
      ]},
    ]
  },
  {
    label: 'Audio',
    metrics: [
      { key: 'avgEnergy', label: 'Energy', suffix: '%' },
      { key: 'avgDanceability', label: 'Danceable', suffix: '%' },
      { key: 'avgValence', label: 'Happiness', suffix: '%' },
      { key: 'avgAcousticness', label: 'Acoustic', suffix: '%' },
      { key: 'avgTempo', label: 'Tempo', suffix: ' bpm' },
    ]
  },
  {
    label: 'Content',
    metrics: [
      { key: 'vaultTracks', label: 'Vault', suffix: '' },
      { key: 'coWriterCount', label: 'Co-writers', suffix: '' },
      { key: 'themeCount', label: 'Themes', suffix: '' },
      { key: 'avgIntensity', label: 'Intensity', suffix: '%' },
    ]
  },
];

const ALL_METRICS = METRIC_GROUPS.flatMap(g => g.metrics);

// Metrics that don't apply to individual songs
const SONG_DISABLED_METRICS = ['songCount'];

function GroupedDropdown({ label, groups, selected, onSelect, subLabel, onCycleSubMode, disabledKeys = [] }) {
  const [open, setOpen] = useState(false);
  const selectedOption = ALL_METRICS.find(o => o.key === selected);

  const closeModal = () => {
    document.activeElement?.blur?.();
    // Delay close to ensure blur completes before modal hides
    requestAnimationFrame(() => {
      setOpen(false);
    });
  };

  const handleItemPress = (option) => {
    if (disabledKeys.includes(option.key)) return;
    if (option.key === selected && option.subModes && onCycleSubMode) {
      onCycleSubMode();
    } else {
      onSelect(option.key);
    }
    closeModal();
  };

  return (
    <View style={styles.dropdownWrapper}>
      <Pressable style={styles.dropdown} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownLabel}>{label}</Text>
        <View style={styles.dropdownValueContainer}>
          <Text style={styles.dropdownValue}>{selectedOption?.label}</Text>
          {subLabel && <Text style={styles.dropdownSubLabel}>{subLabel}</Text>}
        </View>
        <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={open} onRequestClose={closeModal} accessibilityViewIsModal={true}>
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll}>
              {groups.map(group => (
                <View key={group.label} style={styles.modalGroup}>
                  <Text style={styles.modalGroupTitle}>{group.label}</Text>
                  {group.metrics.map(option => {
                    const isDisabled = disabledKeys.includes(option.key);
                    return (
                      <Pressable
                        key={option.key}
                        style={[styles.modalItem, selected === option.key && styles.modalItemActive, isDisabled && styles.modalItemDisabled]}
                        onPress={() => handleItemPress(option)}
                      >
                        <Text style={[styles.modalItemText, selected === option.key && styles.modalItemTextActive, isDisabled && styles.modalItemTextDisabled]}>
                          {option.label}
                        </Text>
                        {selected === option.key && <Text style={styles.modalCheck}>✓</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Dropdown({ label, options, selected, onSelect, disabledKeys = [] }) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find(o => o.key === selected);

  return (
    <View style={styles.dropdownWrapper}>
      <Pressable style={styles.dropdown} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownLabel}>{label}</Text>
        <Text style={styles.dropdownValue}>{selectedOption?.label}</Text>
        <Text style={styles.dropdownArrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={styles.dropdownMenu}>
          {options.map(option => {
            const isDisabled = disabledKeys.includes(option.key);
            return (
              <Pressable
                key={option.key}
                style={[styles.dropdownItem, selected === option.key && styles.dropdownItemActive, isDisabled && styles.dropdownItemDisabled]}
                onPress={() => { if (!isDisabled) { onSelect(option.key); setOpen(false); } }}
              >
                <Text style={[styles.dropdownItemText, selected === option.key && styles.dropdownItemTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function AlbumScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const {
    getAlbumBySlug,
    getSongsForAlbum,
    getSortedAlbums,
    isLoading,
    selectedMetric,
    subModeIndex,
    sortBy,
    changeMetric,
    cycleSubMode,
    setSortBy,
  } = useDataStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isSmall = windowWidth < 380;
  const isMobile = windowWidth < 500;
  const padding = isMobile ? 10 : 16;
  const headerHeight = isMobile ? 100 : 110;

  const album = getAlbumBySlug(slug);
  const songs = album ? getSongsForAlbum(album.id) : [];
  const sortedAlbums = getSortedAlbums();
  const currentIndex = sortedAlbums.findIndex(a => a.id === album?.id);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === sortedAlbums.length - 1;

  const currentMetric = ALL_METRICS.find(m => m.key === selectedMetric);
  const currentSubMode = currentMetric?.subModes?.[subModeIndex];
  const actualDataKey = currentSubMode?.key || selectedMetric;
  const currentSubLabel = currentSubMode?.subLabel || null;
  const currentSuffix = currentSubMode?.suffix ?? currentMetric?.suffix ?? '';
  const treemapWidth = windowWidth - (padding * 2);
  const treemapHeight = Math.max(windowHeight - headerHeight, 300);

  const navigateAlbum = (direction) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < sortedAlbums.length) {
      const nextAlbum = sortedAlbums[newIndex];
      const nextSlug = nextAlbum.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
      router.replace(`/album/${nextSlug}`);
    }
  };

  const treemapData = useMemo(() => {
    if (treemapWidth <= 0 || treemapHeight <= 0 || songs.length === 0) return [];

    const getMetricValue = (item) => {
      if (actualDataKey === 'vocabularyRichness') {
        const total = item.wordCount || 0;
        const unique = item.uniqueWordCount || 0;
        return total > 0 ? Math.round((unique / total) * 100) : 0;
      }
      return item[actualDataKey] || 0;
    };

    // Helper to get content list for display in tiles
    const getContentList = (item, dataKey) => {
      switch (dataKey) {
        case 'coWriterCount':
          return item.coWritersList || [];
        case 'themeCount':
          return item.themesList || [];
        default:
          return [];
      }
    };

    let sortedSongs = [...songs];
    if (sortBy === 'date') {
      sortedSongs.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
    } else if (sortBy === 'value' && selectedMetric !== 'default') {
      sortedSongs.sort((a, b) => getMetricValue(b) - getMetricValue(a));
    }

    const data = sortedSongs.map(song => ({
      id: song.id,
      name: song.name,
      value: selectedMetric === 'default' ? 100 : Math.max(getMetricValue(song) || 1, 1),
      color: song.color || album?.color || colors.fallback,
      metricValue: getMetricValue(song),
      trackNumber: song.trackNumber,
      isVault: song.vaultTracks > 0,
      contentList: getContentList(song, actualDataKey),
    }));

    const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
    return squarify(data, container);
  }, [songs, album, selectedMetric, actualDataKey, sortBy, treemapWidth, treemapHeight]);

  const getSortOptions = () => [
    { key: 'date', label: 'Track #' },
    { key: 'value', label: currentMetric?.label || 'Value' },
  ];

  if (isLoading || !album) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  const metricLabel = currentMetric?.label?.toUpperCase() || '';
  const footerSuffix = sortBy === 'value' && selectedMetric !== 'default'
    ? ` · RANKED BY ${metricLabel}`
    : ' · TRACK ORDER';

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingHorizontal: padding }]}>
        <View style={styles.titleRow}>
          <View style={styles.albumNavContainer}>
            <Pressable
              style={[styles.albumNavButton, isFirst && styles.albumNavButtonDisabled]}
              onPress={() => navigateAlbum(-1)}
              disabled={isFirst}
            >
              <Text style={[styles.albumNavButtonText, isFirst && styles.albumNavButtonTextDisabled]}>‹</Text>
            </Pressable>
            <Text style={[styles.title, isSmall && styles.titleSmall]} numberOfLines={1}>
              {album.display_name}
            </Text>
            <Pressable
              style={[styles.albumNavButton, isLast && styles.albumNavButtonDisabled]}
              onPress={() => navigateAlbum(1)}
              disabled={isLast}
            >
              <Text style={[styles.albumNavButtonText, isLast && styles.albumNavButtonTextDisabled]}>›</Text>
            </Pressable>
          </View>
          <Pressable style={styles.backBtn} onPress={() => router.push('/')}>
            <Text style={styles.backBtnText}>Albums</Text>
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          <GroupedDropdown
            label="View"
            groups={METRIC_GROUPS}
            selected={selectedMetric}
            onSelect={changeMetric}
            subLabel={currentSubLabel}
            onCycleSubMode={() => {
              const subModes = currentMetric?.subModes;
              if (subModes) {
                cycleSubMode(subModes.length);
              }
            }}
            disabledKeys={SONG_DISABLED_METRICS}
          />
          <Dropdown
            label="Sort"
            options={getSortOptions()}
            selected={sortBy}
            onSelect={setSortBy}
            disabledKeys={selectedMetric === 'default' ? ['value'] : []}
          />
        </View>

        <View style={[styles.treemapContainer, { width: treemapWidth, height: treemapHeight }]}>
          {treemapData.map((item, index) => (
            <AnimatedTile
              key={item.id}
              item={item}
              metric={currentMetric}
              suffix={currentSuffix}
              isSmall={isSmall}
              index={index}
              showOrder={sortBy === 'value' && selectedMetric !== 'default'}
              isTrackFive={item.trackNumber === 5}
              isVault={item.isVault}
              isContentMetric={['coWriterCount', 'themeCount'].includes(actualDataKey)}
              onPress={() => router.push(`/song/${item.id}?album=${slug}`)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{songs.length} SONGS{footerSuffix}</Text>
        </View>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { flex: 1, paddingTop: 20 },
  loadingContainer: { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  albumNavContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  albumNavButton: { paddingHorizontal: 12, paddingVertical: 4 },
  albumNavButtonDisabled: { opacity: 0.3 },
  albumNavButtonText: { color: colors.accent.primary, fontSize: 22, fontFamily: 'Outfit_600SemiBold' },
  albumNavButtonTextDisabled: { color: colors.text.muted },
  title: { fontSize: 18, color: colors.text.primary, fontFamily: 'Outfit_600SemiBold', marginHorizontal: 8, maxWidth: '60%', textAlign: 'center' },
  titleSmall: { fontSize: 16 },
  backBtn: { backgroundColor: colors.accent.primaryMuted, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.accent.primaryBorder },
  backBtnText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 9, color: colors.accent.primary, textTransform: 'uppercase', letterSpacing: 1 },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 12, marginBottom: 12, zIndex: 10 },
  dropdownWrapper: { position: 'relative', zIndex: 10 },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.surface.medium, borderWidth: 1, borderColor: colors.border.subtle },
  dropdownLabel: { color: colors.text.muted, fontSize: 9, fontFamily: 'JetBrainsMono_400Regular', textTransform: 'uppercase', letterSpacing: 1 },
  dropdownValueContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownValue: { color: colors.accent.primary, fontSize: 10, fontFamily: 'JetBrainsMono_700Bold', textTransform: 'uppercase', letterSpacing: 1 },
  dropdownSubLabel: { color: colors.text.secondary, fontSize: 8, fontFamily: 'JetBrainsMono_400Regular', textTransform: 'lowercase' },
  dropdownArrow: { color: colors.text.muted, fontSize: 8, marginLeft: 2 },
  dropdownMenu: { position: 'absolute', top: '100%', left: 0, minWidth: 140, marginTop: 4, backgroundColor: colors.surface.heavy, borderRadius: 12, borderWidth: 1, borderColor: colors.border.medium, overflow: 'hidden' },
  dropdownItem: { paddingVertical: 8, paddingHorizontal: 12 },
  dropdownItemActive: { backgroundColor: colors.accent.primaryMuted },
  dropdownItemDisabled: { opacity: 0.3 },
  dropdownItemText: { color: colors.text.secondary, fontSize: 10, fontFamily: 'JetBrainsMono_400Regular', textTransform: 'uppercase', letterSpacing: 1 },
  dropdownItemTextActive: { color: colors.accent.primary },
  modalOverlay: { flex: 1, backgroundColor: colors.bg.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, maxWidth: 340, width: '100%', maxHeight: '70%', borderWidth: 1, borderColor: colors.border.medium },
  modalScroll: { maxHeight: 300 },
  modalGroup: { marginBottom: 16 },
  modalGroupTitle: { fontSize: 10, color: colors.text.muted, fontFamily: 'JetBrainsMono_700Bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  modalItemActive: { backgroundColor: colors.accent.primaryMuted },
  modalItemDisabled: { opacity: 0.4 },
  modalItemText: { color: colors.text.secondary, fontSize: 13, fontFamily: 'Outfit_400Regular' },
  modalItemTextActive: { color: colors.accent.primary, fontFamily: 'Outfit_600SemiBold' },
  modalItemTextDisabled: { color: colors.text.disabled },
  modalCheck: { color: colors.accent.primary, fontSize: 16 },
  treemapContainer: { position: 'relative', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.subtle },
  footer: { paddingVertical: 10, alignItems: 'center' },
  footerText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: colors.text.muted, letterSpacing: 2 },
});
