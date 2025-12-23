import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, useWindowDimensions, SafeAreaView, Platform, Animated, ScrollView, Modal } from 'react-native';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_600SemiBold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import squarify from 'squarify';
import { fetchAlbumsWithMetrics } from './lib/supabase';
import ProfileBuilder from './components/ProfileBuilder';

SplashScreen.preventAutoHideAsync();

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

const SORT_OPTIONS = [
  { key: 'date', label: 'Date' },
  { key: 'value', label: 'Value' },
];

const SONG_SORT_OPTIONS = [
  { key: 'date', label: 'Track' },
  { key: 'value', label: 'Value' },
];

// Metrics that don't make sense for individual songs
const SONG_DISABLED_METRICS = ['songCount'];

function GroupedDropdown({ label, groups, selected, onSelect, subLabel, onCycleSubMode, disabledKeys = [] }) {
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
      {open && (
        <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
          {groups.map(group => (
            <View key={group.label}>
              <Text style={styles.dropdownGroupLabel}>{group.label}</Text>
              {group.metrics.map(option => {
                const isDisabled = disabledKeys.includes(option.key);
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.dropdownItem, selected === option.key && styles.dropdownItemActive, isDisabled && styles.dropdownItemDisabled]}
                    onPress={() => !isDisabled && handleItemPress(option)}
                  >
                    <Text style={[styles.dropdownItemText, selected === option.key && styles.dropdownItemTextActive, isDisabled && styles.dropdownItemTextDisabled]}>
                      {option.label}
                    </Text>
                    {option.subModes && selected === option.key && subLabel && (
                      <Text style={styles.dropdownItemSubLabel}>({subLabel})</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
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

function getContrastColor(hexColor) {
  if (!hexColor) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

function SongDetailModal({ song, songs, albums, metric, dataKey, onClose }) {
  if (!song) return null;

  const album = albums.find(a => a.id === song.album_id);
  const songValue = song[dataKey] || 0;
  const albumAvg = album?.[dataKey] || 0;
  const diffFromAlbum = albumAvg ? Math.round(((songValue - albumAvg) / albumAvg) * 100) : 0;

  // Calculate rank among all songs
  const allSongsWithMetric = songs
    .filter(s => s[dataKey] !== undefined && s[dataKey] !== null)
    .sort((a, b) => (b[dataKey] || 0) - (a[dataKey] || 0));
  const rank = allSongsWithMetric.findIndex(s => s.id === song.id) + 1;
  const totalSongs = allSongsWithMetric.length;
  const percentile = totalSongs > 0 ? Math.round((1 - (rank - 1) / totalSongs) * 100) : 0;

  // Find similar and different songs (exclude current song)
  const otherSongs = songs.filter(s => s.id !== song.id && s[dataKey] !== undefined);
  const sortedByDiff = otherSongs
    .map(s => ({ ...s, diff: Math.abs((s[dataKey] || 0) - songValue) }))
    .sort((a, b) => a.diff - b.diff);

  const mostSimilar = sortedByDiff.slice(0, 3);
  const mostDifferent = sortedByDiff.slice(-3).reverse();

  // Quick stats
  const duration = song.totalMinutes ? `${Math.floor(song.totalMinutes)}:${String(Math.round((song.totalMinutes % 1) * 60)).padStart(2, '0')}` : '--';
  const vocabRichness = song.wordCount > 0 ? Math.round((song.uniqueWordCount / song.wordCount) * 100) : 0;

  const metricLabel = metric?.label || 'Value';
  const suffix = metric?.suffix || '';

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalAlbumDot, { backgroundColor: song.color }]} />
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle} numberOfLines={2}>{song.name}</Text>
                <Text style={styles.modalSubtitle}>{album?.display_name || 'Unknown Album'}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={onClose}>
                <Text style={styles.modalCloseText}>×</Text>
              </Pressable>
            </View>

            {/* Rank Section */}
            {metric?.key !== 'default' && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{metricLabel} Ranking</Text>
                <View style={styles.rankRow}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankNumber}>#{rank}</Text>
                    <Text style={styles.rankTotal}>of {totalSongs}</Text>
                  </View>
                  <View style={styles.rankStats}>
                    <Text style={styles.rankValue}>{songValue.toLocaleString()}{suffix}</Text>
                    <Text style={styles.rankPercentile}>Top {percentile}%</Text>
                    <Text style={[styles.rankDiff, { color: diffFromAlbum >= 0 ? '#4ade80' : '#f87171' }]}>
                      {diffFromAlbum >= 0 ? '+' : ''}{diffFromAlbum}% vs album avg
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Quick Stats</Text>
              <View style={styles.quickStats}>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{duration}</Text>
                  <Text style={styles.quickStatLabel}>Duration</Text>
                </View>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{song.wordCount?.toLocaleString() || 0}</Text>
                  <Text style={styles.quickStatLabel}>Words</Text>
                </View>
                <View style={styles.quickStat}>
                  <Text style={styles.quickStatValue}>{vocabRichness}%</Text>
                  <Text style={styles.quickStatLabel}>Unique</Text>
                </View>
                {song.vaultTracks > 0 && (
                  <View style={[styles.quickStat, styles.vaultBadge]}>
                    <Text style={styles.vaultText}>VAULT</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Similar Songs */}
            {metric?.key !== 'default' && mostSimilar.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Most Similar ({metricLabel})</Text>
                {mostSimilar.map((s, i) => {
                  const sAlbum = albums.find(a => a.id === s.album_id);
                  return (
                    <View key={s.id} style={styles.songRow}>
                      <View style={[styles.songDot, { backgroundColor: s.color }]} />
                      <View style={styles.songInfo}>
                        <Text style={styles.songName} numberOfLines={1}>{s.name}</Text>
                        <Text style={styles.songAlbum} numberOfLines={1}>{sAlbum?.display_name}</Text>
                      </View>
                      <Text style={styles.songValue}>{(s[dataKey] || 0).toLocaleString()}{suffix}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Different Songs */}
            {metric?.key !== 'default' && mostDifferent.length > 0 && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Most Different ({metricLabel})</Text>
                {mostDifferent.map((s, i) => {
                  const sAlbum = albums.find(a => a.id === s.album_id);
                  return (
                    <View key={s.id} style={styles.songRow}>
                      <View style={[styles.songDot, { backgroundColor: s.color }]} />
                      <View style={styles.songInfo}>
                        <Text style={styles.songName} numberOfLines={1}>{s.name}</Text>
                        <Text style={styles.songAlbum} numberOfLines={1}>{sAlbum?.display_name}</Text>
                      </View>
                      <Text style={styles.songValue}>{(s[dataKey] || 0).toLocaleString()}{suffix}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AnimatedTile({ item, metric, isSmall, index, showOrder, onPress }) {
  const textColor = getContrastColor(item.color);
  const width = item.x1 - item.x0;
  const height = item.y1 - item.y0;
  const showValue = metric.key !== 'default' && width > 50 && height > 40;
  const nameFontSize = Math.max(Math.min(width / 7, height / 4, isSmall ? 14 : 18), 10);
  const valueFontSize = Math.max(Math.min(width / 9, height / 5, isSmall ? 11 : 13), 9);
  const orderFontSize = Math.max(Math.min(width / 10, height / 6, 11), 8);
  const showOrderNumber = showOrder && width > 40 && height > 35;

  const animatedValues = useRef({
    left: new Animated.Value(item.x0),
    top: new Animated.Value(item.y0),
    width: new Animated.Value(width),
    height: new Animated.Value(height),
  }).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedValues.left, { toValue: item.x0, useNativeDriver: false, tension: 40, friction: 8 }),
      Animated.spring(animatedValues.top, { toValue: item.y0, useNativeDriver: false, tension: 40, friction: 8 }),
      Animated.spring(animatedValues.width, { toValue: width, useNativeDriver: false, tension: 40, friction: 8 }),
      Animated.spring(animatedValues.height, { toValue: height, useNativeDriver: false, tension: 40, friction: 8 }),
    ]).start();
  }, [item.x0, item.y0, width, height]);

  const TileContent = (
    <>
      {showOrderNumber && (
        <View style={[styles.tileOrder, { backgroundColor: textColor === '#000000' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]}>
          <Text style={[styles.tileOrderText, { color: textColor, fontSize: orderFontSize }]}>
            {index + 1}
          </Text>
        </View>
      )}
      <Text style={[styles.tileName, { color: textColor, fontSize: nameFontSize }]} numberOfLines={2} adjustsFontSizeToFit>
        {item.name}
      </Text>
      {showValue && (
        <Text style={[styles.tileValue, { color: textColor, fontSize: valueFontSize }]}>
          {item.metricValue.toLocaleString()}{metric.suffix}
        </Text>
      )}
    </>
  );

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          left: animatedValues.left,
          top: animatedValues.top,
          width: animatedValues.width,
          height: animatedValues.height,
          backgroundColor: item.color,
        },
      ]}
    >
      {onPress ? (
        <Pressable style={styles.tileInner} onPress={() => onPress(item)}>
          {TileContent}
        </Pressable>
      ) : TileContent}
    </Animated.View>
  );
}

export default function App() {
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('default');
  const [subModeIndex, setSubModeIndex] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [currentView, setCurrentView] = useState('treemap'); // 'treemap' | 'profile'
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isSmall = windowWidth < 380;
  const isMobile = windowWidth < 500;
  const padding = isMobile ? 10 : 16;
  const headerHeight = isMobile ? 100 : 110;

  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    async function loadData() {
      const { albums: albumData, songs: songData } = await fetchAlbumsWithMetrics();
      setAlbums(albumData);
      setSongs(songData);
      setDataLoading(false);
    }
    loadData();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !dataLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dataLoading]);

  const loading = !fontsLoaded || dataLoading;

  const currentMetric = ALL_METRICS.find(m => m.key === selectedMetric);
  const actualDataKey = currentMetric?.subModes
    ? currentMetric.subModes[subModeIndex].key
    : selectedMetric;
  const currentSubLabel = currentMetric?.subModes
    ? currentMetric.subModes[subModeIndex].subLabel
    : null;
  const treemapWidth = windowWidth - (padding * 2);
  const treemapHeight = Math.max(windowHeight - headerHeight, 300);

  const treemapData = useMemo(() => {
    if (treemapWidth <= 0 || treemapHeight <= 0) return [];

    // Drill-down mode: show songs from selected album
    if (selectedAlbum) {
      const albumSongs = songs.filter(s => s.album_id === selectedAlbum.id);
      if (albumSongs.length === 0) return [];

      let sortedSongs = [...albumSongs];
      if (sortBy === 'date') {
        sortedSongs.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
      } else if (sortBy === 'value' && selectedMetric !== 'default') {
        sortedSongs.sort((a, b) => (b[actualDataKey] || 0) - (a[actualDataKey] || 0));
      }

      const data = sortedSongs.map(song => ({
        id: song.id,
        name: song.name,
        value: selectedMetric === 'default' ? 100 : Math.max(song[actualDataKey] || 1, 1),
        color: song.color || selectedAlbum.color || '#666',
        metricValue: song[actualDataKey] || 0,
      }));

      const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
      return squarify(data, container);
    }

    // Album view
    if (albums.length === 0) return [];

    let sortedAlbums = [...albums];
    if (sortBy === 'date') {
      sortedAlbums.sort((a, b) => new Date(a.official_release_date) - new Date(b.official_release_date));
    } else if (sortBy === 'value' && selectedMetric !== 'default') {
      sortedAlbums.sort((a, b) => (b[actualDataKey] || 0) - (a[actualDataKey] || 0));
    }

    const data = sortedAlbums.map(album => ({
      id: album.id,
      name: album.display_name,
      value: selectedMetric === 'default' ? 100 : Math.max(album[actualDataKey] || 1, 1),
      color: album.color || '#666',
      metricValue: album[actualDataKey] || 0,
    }));

    const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
    return squarify(data, container);
  }, [albums, songs, selectedAlbum, selectedMetric, actualDataKey, sortBy, treemapWidth, treemapHeight]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Loading discography...</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  const metricLabel = currentMetric?.label?.toUpperCase() || '';
  const subLabelUpper = currentSubLabel ? ` (${currentSubLabel.toUpperCase()})` : '';
  const sortLabel = selectedAlbum ? 'TRACK ORDER' : 'CHRONOLOGICAL';
  const footerSuffix = sortBy === 'value' && selectedMetric !== 'default'
    ? ` · RANKED BY ${metricLabel}${subLabelUpper}`
    : ` · ${sortLabel}`;

  // Show Profile Builder
  if (currentView === 'profile') {
    return (
      <ProfileBuilder
        albums={albums}
        songs={songs}
        onClose={() => setCurrentView('treemap')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
      <View style={[styles.content, { paddingHorizontal: padding }]}>
        <View style={styles.titleRow}>
          {selectedAlbum ? (
            <>
              <Pressable style={styles.backButton} onPress={() => setSelectedAlbum(null)}>
                <Text style={styles.backButtonText}>←</Text>
              </Pressable>
              <Text style={[styles.title, isSmall && styles.titleSmall, styles.titleCenter]} numberOfLines={1}>
                {selectedAlbum.display_name}
              </Text>
            </>
          ) : (
            <Text style={[styles.title, isSmall && styles.titleSmall, styles.titleCenter]}>Taylor Swift</Text>
          )}
          <Pressable style={styles.profileBtn} onPress={() => setCurrentView('profile')}>
            <Text style={styles.profileBtnText}>Profile</Text>
          </Pressable>
        </View>

        <View style={styles.controlsRow}>
          <GroupedDropdown
            label="Size"
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
            disabledKeys={selectedAlbum ? SONG_DISABLED_METRICS : []}
          />
          <Dropdown label="Sort" options={selectedAlbum ? SONG_SORT_OPTIONS : SORT_OPTIONS} selected={sortBy} onSelect={setSortBy} disabledKeys={selectedMetric === "default" ? ["value"] : []} />
        </View>

        <View style={[styles.treemapContainer, { width: treemapWidth, height: treemapHeight }]}>
          {treemapData.map((item, index) => (
            <AnimatedTile
              key={item.id || item.name}
              item={item}
              metric={currentMetric}
              isSmall={isSmall}
              index={index}
              showOrder={sortBy === 'value' && selectedMetric !== 'default'}
              onPress={(tileItem) => {
                if (selectedAlbum) {
                  // In album view - show song detail
                  const song = songs.find(s => s.id === tileItem.id);
                  if (song) setSelectedSong(song);
                } else {
                  // In main view - drill into album
                  const album = albums.find(a => a.id === tileItem.id);
                  if (album) setSelectedAlbum(album);
                }
              }}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {selectedAlbum
              ? `${songs.filter(s => s.album_id === selectedAlbum.id).length} SONGS${footerSuffix}`
              : `${albums.length} ALBUMS${footerSuffix}`
            }
          </Text>
        </View>
      </View>
      <StatusBar style="light" />

      <SongDetailModal
        song={selectedSong}
        songs={songs}
        albums={albums}
        metric={currentMetric}
        dataKey={actualDataKey}
        onClose={() => setSelectedSong(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'web' ? 20 : 12,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: 'rgba(226, 232, 240, 0.5)',
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Outfit_600SemiBold',
  },
  titleSmall: {
    fontSize: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleCenter: {
    flex: 1,
    marginBottom: 0,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  backButtonText: {
    color: '#38bdf8',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
    zIndex: 10,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.3)',
  },
  dropdownLabel: {
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: 9,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dropdownValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dropdownValue: {
    color: '#38bdf8',
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dropdownSubLabel: {
    color: 'rgba(148, 163, 184, 0.6)',
    fontSize: 8,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'lowercase',
  },
  dropdownArrow: {
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: 8,
    marginLeft: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: 140,
    maxHeight: 300,
    marginTop: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    overflow: 'hidden',
  },
  dropdownGroupLabel: {
    color: 'rgba(148, 163, 184, 0.4)',
    fontSize: 8,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  dropdownItemText: {
    color: 'rgba(148, 163, 184, 0.7)',
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dropdownItemTextActive: {
    color: '#38bdf8',
  },
  dropdownItemDisabled: {
    opacity: 0.3,
  },
  dropdownItemTextDisabled: {
    color: 'rgba(148, 163, 184, 0.3)',
  },
  dropdownItemSubLabel: {
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: 8,
    fontFamily: 'JetBrainsMono_400Regular',
    marginLeft: 4,
  },
  treemapContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.3)',
  },
  tile: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(2, 6, 23, 0.8)',
    borderRadius: 8,
  },
  tileInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileName: {
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  tileValue: {
    marginTop: 4,
    fontFamily: 'JetBrainsMono_400Regular',
    textAlign: 'center',
    opacity: 0.85,
  },
  tileOrder: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileOrderText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: 'rgba(148, 163, 184, 0.4)',
    letterSpacing: 2,
  },
  profileBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  profileBtnText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 9,
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.5)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalAlbumDot: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    color: '#e2e8f0',
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.6)',
    fontFamily: 'Outfit_400Regular',
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: 'rgba(148, 163, 184, 0.6)',
    fontFamily: 'Outfit_300Light',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 10,
    color: 'rgba(148, 163, 184, 0.5)',
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 24,
    color: '#38bdf8',
    fontFamily: 'JetBrainsMono_700Bold',
  },
  rankTotal: {
    fontSize: 10,
    color: 'rgba(148, 163, 184, 0.5)',
    fontFamily: 'JetBrainsMono_400Regular',
  },
  rankStats: {
    flex: 1,
  },
  rankValue: {
    fontSize: 16,
    color: '#e2e8f0',
    fontFamily: 'JetBrainsMono_700Bold',
    marginBottom: 2,
  },
  rankPercentile: {
    fontSize: 12,
    color: '#38bdf8',
    fontFamily: 'JetBrainsMono_400Regular',
    marginBottom: 2,
  },
  rankDiff: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStat: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.3)',
  },
  quickStatValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'JetBrainsMono_700Bold',
  },
  quickStatLabel: {
    fontSize: 8,
    color: 'rgba(148, 163, 184, 0.5)',
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  vaultBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  vaultText: {
    fontSize: 10,
    color: '#fbbf24',
    fontFamily: 'JetBrainsMono_700Bold',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.2)',
  },
  songDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    fontSize: 13,
    color: '#e2e8f0',
    fontFamily: 'Outfit_400Regular',
  },
  songAlbum: {
    fontSize: 10,
    color: 'rgba(148, 163, 184, 0.5)',
    fontFamily: 'Outfit_300Light',
  },
  songValue: {
    fontSize: 11,
    color: '#38bdf8',
    fontFamily: 'JetBrainsMono_400Regular',
  },
});
