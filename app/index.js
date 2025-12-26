import { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, useWindowDimensions, SafeAreaView, Platform, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import squarify from 'squarify';
import { useDataStore, albumToSlug } from '../stores/dataStore';
import { loadProfile } from '../lib/storage';
import { colors, getContrastColor, getOverlayColor } from '../lib/theme';
import AnimatedTile from '../components/AnimatedTile';

const METRIC_GROUPS = [
  {
    label: 'Basic',
    metrics: [
      { key: 'default', label: 'Default', suffix: '' },
      { key: 'songCount', label: 'Songs', suffix: '' },
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
      { key: 'totalCharacters', label: 'Characters', suffix: '' },
      { key: 'avgIntensity', label: 'Intensity', suffix: '%' },
    ]
  },
];

const ALL_METRICS = METRIC_GROUPS.flatMap(g => g.metrics);

const METRIC_INFO = {
  default: { title: 'Default View', description: 'Shows all albums with equal sizing.' },
  songCount: { title: 'Song Count', description: 'Total songs on each album.' },
  totalMinutes: { title: 'Total Minutes', description: 'Combined runtime in minutes.' },
  words: { title: 'Words', description: 'Lyrics analysis - total, unique, or vocabulary richness.' },
  avgEnergy: { title: 'Energy', description: 'How intense and active the music feels.' },
  avgDanceability: { title: 'Danceability', description: 'How suitable for dancing.' },
  avgValence: { title: 'Happiness', description: 'Musical positivity score.' },
  avgAcousticness: { title: 'Acoustic', description: 'Confidence track is acoustic.' },
  avgTempo: { title: 'Tempo', description: 'Speed in BPM.' },
  vaultTracks: { title: 'Vault Tracks', description: 'Previously unreleased songs.' },
  coWriterCount: { title: 'Co-writers', description: 'Number of collaborators.' },
  themeCount: { title: 'Themes', description: 'Distinct lyrical themes.' },
  totalCharacters: { title: 'Characters', description: 'Named characters in lyrics.' },
  avgIntensity: { title: 'Intensity', description: 'Emotional intensity of lyrics.' },
};

const ARTISTS = [
  { id: 'taylor-swift', name: 'Taylor Swift', available: true },
  { id: 'coming-soon', name: 'More artists coming...', available: false },
];

function GroupedDropdown({ label, groups, selected, onSelect, subLabel, onCycleSubMode }) {
  const [open, setOpen] = useState(false);
  const selectedOption = ALL_METRICS.find(o => o.key === selected);

  const handleItemPress = (option) => {
    if (option.key === selected && option.subModes && onCycleSubMode) {
      onCycleSubMode();
    } else {
      onSelect(option.key);
    }
    setOpen(false);
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
      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)} accessibilityViewIsModal={true}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <Pressable style={styles.modalClose} onPress={() => setOpen(false)}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {groups.map(group => (
                <View key={group.label} style={styles.modalGroup}>
                  <Text style={styles.modalGroupTitle}>{group.label}</Text>
                  {group.metrics.map(option => (
                    <Pressable
                      key={option.key}
                      style={[styles.modalItem, selected === option.key && styles.modalItemActive]}
                      onPress={() => handleItemPress(option)}
                    >
                      <Text style={[styles.modalItemText, selected === option.key && styles.modalItemTextActive]}>
                        {option.label}
                      </Text>
                      {selected === option.key && <Text style={styles.modalCheck}>✓</Text>}
                    </Pressable>
                  ))}
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
                <Text style={[styles.dropdownItemText, selected === option.key && styles.dropdownItemTextActive, isDisabled && styles.dropdownItemTextDisabled]}>
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

function ArtistDropdown({ selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const selectedArtist = ARTISTS.find(a => a.id === selected);

  return (
    <View style={styles.artistDropdownWrapper}>
      <Pressable style={styles.artistDropdown} onPress={() => setOpen(!open)}>
        <Text style={styles.artistName}>{selectedArtist?.name}</Text>
        <Text style={styles.artistDropdownArrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={styles.artistDropdownMenu}>
          {ARTISTS.map(artist => (
            <Pressable
              key={artist.id}
              style={[styles.artistDropdownItem, selected === artist.id && styles.artistDropdownItemActive, !artist.available && styles.artistDropdownItemDisabled]}
              onPress={() => { if (artist.available) { onSelect(artist.id); setOpen(false); } }}
            >
              <Text style={[styles.artistDropdownItemText, selected === artist.id && styles.artistDropdownItemTextActive, !artist.available && styles.artistDropdownItemTextDisabled]}>
                {artist.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function InfoButton({ metricKey }) {
  const [visible, setVisible] = useState(false);
  const info = METRIC_INFO[metricKey] || METRIC_INFO.default;

  return (
    <>
      <Pressable style={styles.infoButton} onPress={() => setVisible(true)}>
        <Text style={styles.infoButtonText}>ⓘ</Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={() => setVisible(false)} accessibilityViewIsModal={true}>
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={styles.infoModalContent}>
            <Text style={styles.infoModalTitle}>{info.title}</Text>
            <Text style={styles.infoModalDescription}>{info.description}</Text>
            <Pressable style={styles.infoModalClose} onPress={() => setVisible(false)}>
              <Text style={styles.infoModalCloseText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { albums, songs, isLoading, loadData } = useDataStore();
  const [selectedMetric, setSelectedMetric] = useState('default');
  const [subModeIndex, setSubModeIndex] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [hasProfile, setHasProfile] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState('taylor-swift');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isSmall = windowWidth < 380;
  const isMobile = windowWidth < 500;
  const padding = isMobile ? 10 : 16;
  const headerHeight = isMobile ? 100 : 110;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadProfile().then(profile => {
      setHasProfile(profile && profile.topAlbums?.length > 0);
    });
  }, []);

  const currentMetric = ALL_METRICS.find(m => m.key === selectedMetric);
  const currentSubMode = currentMetric?.subModes?.[subModeIndex];
  const actualDataKey = currentSubMode?.key || selectedMetric;
  const currentSubLabel = currentSubMode?.subLabel || null;
  const currentSuffix = currentSubMode?.suffix ?? currentMetric?.suffix ?? '';
  const treemapWidth = windowWidth - (padding * 2);
  const treemapHeight = Math.max(windowHeight - headerHeight, 300);

  const treemapData = useMemo(() => {
    if (treemapWidth <= 0 || treemapHeight <= 0 || albums.length === 0) return [];

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
        case 'vaultTracks':
          return item.vaultTracksList || [];
        case 'coWriterCount':
          return item.coWritersList || [];
        case 'themeCount':
          return item.themesList || [];
        default:
          return [];
      }
    };

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
      contentList: getContentList(album, actualDataKey),
    }));

    const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
    return squarify(data, container);
  }, [albums, selectedMetric, actualDataKey, sortBy, treemapWidth, treemapHeight]);

  const getSortOptions = () => [
    { key: 'date', label: 'Released' },
    { key: 'value', label: currentMetric?.label || 'Value' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <Text style={styles.loadingText}>Loading discography...</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  const metricLabel = currentMetric?.label?.toUpperCase() || '';
  const footerSuffix = sortBy === 'value' && selectedMetric !== 'default'
    ? ` · RANKED BY ${metricLabel}`
    : ' · CHRONOLOGICAL';

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingHorizontal: padding }]}>
        <View style={styles.titleRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.appName, isSmall && styles.appNameSmall]}>Music Besties</Text>
            <ArtistDropdown selected={selectedArtist} onSelect={setSelectedArtist} />
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.navBtn} onPress={() => router.push('/premium')}>
              <Text style={styles.navBtnText}>⭐</Text>
            </Pressable>
            <Pressable style={styles.profileBtn} onPress={() => router.push('/profile')}>
              <Text style={styles.profileBtnText}>{hasProfile ? 'Profile' : 'Create'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.controlsRow}>
          <GroupedDropdown
            label="View"
            groups={METRIC_GROUPS}
            selected={selectedMetric}
            onSelect={(key) => {
              setSelectedMetric(key);
              setSubModeIndex(0);
              setSortBy(key === 'default' ? 'date' : 'value');
            }}
            subLabel={currentSubLabel}
            onCycleSubMode={() => {
              const subModes = currentMetric?.subModes;
              if (subModes) {
                setSubModeIndex((subModeIndex + 1) % subModes.length);
              }
            }}
          />
          <Dropdown
            label="Sort"
            options={getSortOptions()}
            selected={sortBy}
            onSelect={setSortBy}
            disabledKeys={selectedMetric === 'default' ? ['value'] : []}
          />
          <InfoButton metricKey={selectedMetric} />
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
              isContentMetric={['vaultTracks', 'coWriterCount', 'themeCount'].includes(actualDataKey)}
              onPress={() => router.push(`/album/${item.slug}`)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{albums.length} ALBUMS{footerSuffix}</Text>
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
  loadingText: { marginTop: 16, color: colors.text.muted, fontSize: 14, fontFamily: 'Outfit_400Regular', letterSpacing: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appName: { fontSize: 18, color: colors.text.primary, fontFamily: 'Outfit_800ExtraBold' },
  appNameSmall: { fontSize: 15 },
  navBtn: { padding: 8 },
  navBtnText: { fontSize: 18 },
  profileBtn: { backgroundColor: colors.accent.primaryMuted, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.accent.primaryBorder },
  profileBtnText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: 9, color: colors.accent.primary, textTransform: 'uppercase', letterSpacing: 1 },
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
  dropdownItemTextDisabled: { color: colors.text.disabled },
  artistDropdownWrapper: { position: 'relative' },
  artistDropdown: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, backgroundColor: colors.surface.medium, borderWidth: 1, borderColor: colors.border.subtle },
  artistName: { color: colors.accent.primary, fontSize: 11, fontFamily: 'Outfit_600SemiBold' },
  artistDropdownArrow: { color: colors.text.muted, fontSize: 8 },
  artistDropdownMenu: { position: 'absolute', top: '100%', left: 0, minWidth: 160, marginTop: 4, backgroundColor: colors.surface.heavy, borderRadius: 12, borderWidth: 1, borderColor: colors.border.medium, overflow: 'hidden', zIndex: 100 },
  artistDropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  artistDropdownItemActive: { backgroundColor: colors.accent.primaryMuted },
  artistDropdownItemDisabled: { opacity: 0.5 },
  artistDropdownItemText: { color: colors.text.secondary, fontSize: 12, fontFamily: 'Outfit_400Regular' },
  artistDropdownItemTextActive: { color: colors.accent.primary, fontFamily: 'Outfit_600SemiBold' },
  artistDropdownItemTextDisabled: { color: colors.text.disabled, fontStyle: 'italic' },
  infoButton: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.surface.medium, borderWidth: 1, borderColor: colors.border.subtle },
  infoButtonText: { color: colors.accent.primary, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: colors.bg.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.bg.card, borderRadius: 20, padding: 20, maxWidth: 340, width: '100%', maxHeight: '70%', borderWidth: 1, borderColor: colors.border.medium },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, color: colors.text.primary, fontFamily: 'Outfit_600SemiBold' },
  modalClose: { padding: 4 },
  modalCloseText: { fontSize: 24, color: colors.text.secondary, fontFamily: 'Outfit_300Light' },
  modalScroll: { maxHeight: 300 },
  modalGroup: { marginBottom: 16 },
  modalGroupTitle: { fontSize: 10, color: colors.text.muted, fontFamily: 'JetBrainsMono_700Bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  modalItemActive: { backgroundColor: colors.accent.primaryMuted },
  modalItemText: { color: colors.text.secondary, fontSize: 13, fontFamily: 'Outfit_400Regular' },
  modalItemTextActive: { color: colors.accent.primary, fontFamily: 'Outfit_600SemiBold' },
  modalCheck: { color: colors.accent.primary, fontSize: 16 },
  infoModalContent: { backgroundColor: colors.bg.card, borderRadius: 16, padding: 24, maxWidth: 320, width: '100%', borderWidth: 1, borderColor: colors.border.medium },
  infoModalTitle: { fontSize: 18, color: colors.text.primary, fontFamily: 'Outfit_600SemiBold', marginBottom: 12 },
  infoModalDescription: { fontSize: 14, color: colors.text.secondary, fontFamily: 'Outfit_400Regular', lineHeight: 22, marginBottom: 20 },
  infoModalClose: { backgroundColor: colors.accent.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  infoModalCloseText: { color: colors.text.inverse, fontSize: 13, fontFamily: 'Outfit_600SemiBold' },
  treemapContainer: { position: 'relative', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.border.subtle },
  footer: { paddingVertical: 10, alignItems: 'center' },
  footerText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: 9, color: colors.text.muted, letterSpacing: 2 },
});
