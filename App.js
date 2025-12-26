import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator, useWindowDimensions, SafeAreaView, Animated, ScrollView, Modal } from 'react-native';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_600SemiBold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { JetBrainsMono_400Regular, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import squarify from 'squarify';
import { fetchAlbumsWithMetrics } from './lib/supabase';
import ProfileBuilder from './components/ProfileBuilder';
import SharedProfileView from './components/SharedProfileView';
import ComparisonLeaderboard from './components/ComparisonLeaderboard';
import PremiumPage from './components/PremiumPage';
import { BlurredSection } from './components/PaywallBlur';
import LinkAccountPrompt from './components/LinkAccountPrompt';
import { loadProfile } from './lib/storage';
import { useAuthStore } from './stores/authStore';
import { useSubscriptionStore } from './stores/subscriptionStore';
import { colors, getContrastColor, getOverlayColor } from './lib/theme';
import SongDeepDive from './components/SongDeepDive';

// Parse URL parameters
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    payment: params.get('payment'),
    sessionId: params.get('session_id'),
  };
}

// Parse share profile ID from URL path
function getShareIdFromPath() {
  const path = window.location.pathname;
  const match = path.match(/^\/p\/([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

// Clear path to home
function navigateToHome() {
  if (window.history.replaceState) {
    window.history.replaceState({}, '', '/');
  }
}

// Clear URL parameters after reading
function clearUrlParams() {
  if (window.history.replaceState) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

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

// Dynamic sort options based on selected metric
const getSortOptions = (metric, subLabel, isAlbumView) => {
  const metricLabel = metric?.label || 'Value';
  const displayLabel = subLabel ? `${metricLabel} (${subLabel})` : metricLabel;

  if (isAlbumView) {
    return [
      { key: 'date', label: 'Released' },
      { key: 'value', label: displayLabel },
    ];
  } else {
    return [
      { key: 'date', label: 'Track #' },
      { key: 'value', label: displayLabel },
    ];
  }
};

// Metrics that don't make sense for individual songs
const SONG_DISABLED_METRICS = ['songCount'];

// Artist options (for future multi-artist support)
const ARTISTS = [
  { id: 'taylor-swift', name: 'Taylor Swift', available: true },
  { id: 'coming-soon', name: 'More artists coming...', available: false },
];

// Metric explanations for info button
const METRIC_INFO = {
  default: { title: 'Default View', description: 'Shows all albums/songs with equal sizing to compare them visually.' },
  songCount: { title: 'Song Count', description: 'Total number of songs on each album, including bonus and vault tracks.' },
  totalMinutes: { title: 'Total Minutes', description: 'Combined runtime of all songs on the album in minutes.' },
  words: { title: 'Words', description: 'Lyrics analysis - toggle between total words, unique words, or vocabulary richness (unique/total %).' },
  avgEnergy: { title: 'Energy', description: 'How intense and active the music feels. Based on loudness, tempo, and dynamic range. Higher = more energetic.' },
  avgDanceability: { title: 'Danceability', description: 'How suitable for dancing based on tempo, rhythm stability, and beat strength. Higher = easier to dance to.' },
  avgValence: { title: 'Happiness', description: 'Musical positivity - major keys, upbeat tempos score higher. Measures how cheerful or melancholic a song sounds.' },
  avgAcousticness: { title: 'Acoustic', description: 'Confidence that the track is acoustic (non-electronic instruments). Higher = more acoustic sound.' },
  avgTempo: { title: 'Tempo', description: 'Speed of the music in beats per minute (BPM). Higher = faster songs.' },
  vaultTracks: { title: 'Vault Tracks', description: 'Previously unreleased songs from the vault, included on Taylor\'s Version re-recordings.' },
  coWriterCount: { title: 'Co-writers', description: 'Number of songwriting collaborators on the album. Shows Taylor\'s collaborative range.' },
  themeCount: { title: 'Themes', description: 'Number of distinct lyrical themes explored across the album\'s songs.' },
  totalCharacters: { title: 'Characters', description: 'Named characters mentioned across all songs - lovers, friends, and storytelling figures.' },
  avgIntensity: { title: 'Intensity', description: 'Emotional intensity of the lyrics - combines sentiment analysis with language patterns.' },
};

function GroupedDropdown({ label, groups, selected, onSelect, subLabel, onCycleSubMode, disabledKeys = [] }) {
  const [open, setOpen] = useState(false);
  const selectedOption = ALL_METRICS.find(o => o.key === selected);

  const closeModal = () => {
    document.activeElement?.blur?.();
    setOpen(false);
  };

  const handleItemPress = (option) => {
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
        <Pressable style={styles.viewModalOverlay} onPress={closeModal}>
          <View style={styles.viewModalContent}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.viewModalTitle}>Select {label}</Text>
              <Pressable style={styles.viewModalClose} onPress={closeModal}>
                <Text style={styles.viewModalCloseText}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.viewModalScroll} showsVerticalScrollIndicator={false}>
              {groups.map(group => (
                <View key={group.label} style={styles.viewModalGroup}>
                  <Text style={styles.viewModalGroupTitle}>{group.label}</Text>
                  <View style={styles.viewModalItems}>
                    {group.metrics.map(option => {
                      const isDisabled = disabledKeys.includes(option.key);
                      const isSelected = selected === option.key;
                      return (
                        <Pressable
                          key={option.key}
                          style={[
                            styles.viewModalItem,
                            isSelected && styles.viewModalItemActive,
                            isDisabled && styles.viewModalItemDisabled
                          ]}
                          onPress={() => !isDisabled && handleItemPress(option)}
                        >
                          <View style={styles.viewModalItemContent}>
                            <Text style={[
                              styles.viewModalItemText,
                              isSelected && styles.viewModalItemTextActive,
                              isDisabled && styles.viewModalItemTextDisabled
                            ]}>
                              {option.label}
                            </Text>
                            {option.subModes && isSelected && subLabel && (
                              <Text style={styles.viewModalItemSubLabel}>tap to cycle: {subLabel}</Text>
                            )}
                          </View>
                          {isSelected && <Text style={styles.viewModalCheck}>✓</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
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
              style={[
                styles.artistDropdownItem,
                selected === artist.id && styles.artistDropdownItemActive,
                !artist.available && styles.artistDropdownItemDisabled
              ]}
              onPress={() => {
                if (artist.available) {
                  onSelect(artist.id);
                  setOpen(false);
                }
              }}
            >
              <Text style={[
                styles.artistDropdownItemText,
                selected === artist.id && styles.artistDropdownItemTextActive,
                !artist.available && styles.artistDropdownItemTextDisabled
              ]}>
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

  const closeModal = () => {
    document.activeElement?.blur?.();
    setVisible(false);
  };

  return (
    <>
      <Pressable style={styles.infoButton} onPress={() => setVisible(true)}>
        <Text style={styles.infoButtonText}>ⓘ</Text>
      </Pressable>
      <Modal transparent animationType="fade" visible={visible} onRequestClose={closeModal} accessibilityViewIsModal={true}>
        <Pressable style={styles.infoModalOverlay} onPress={closeModal}>
          <View style={styles.infoModalContent}>
            <Text style={styles.infoModalTitle}>{info.title}</Text>
            <Text style={styles.infoModalDescription}>{info.description}</Text>
            <Pressable style={styles.infoModalClose} onPress={closeModal}>
              <Text style={styles.infoModalCloseText}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}


function SongDetailModal({ song, songs, albums, metric, dataKey, onClose, onNavigateToPremium }) {
  const [showDeepDive, setShowDeepDive] = useState(false);

  const handleClose = () => {
    document.activeElement?.blur?.();
    onClose();
  };

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
    <Modal transparent animationType="fade" onRequestClose={handleClose} accessibilityViewIsModal={true}>
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalAlbumDot, { backgroundColor: song.color }]} />
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle} numberOfLines={2}>{song.name}</Text>
                <Text style={styles.modalSubtitle}>{album?.display_name || 'Unknown Album'}</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={handleClose}>
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
                    <Text style={[styles.rankDiff, { color: diffFromAlbum >= 0 ? colors.semantic.success : colors.semantic.error }]}>
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

            {/* Similar Songs - Premium Feature */}
            {metric?.key !== 'default' && mostSimilar.length > 0 && (
              <BlurredSection title={`Most Similar (${metricLabel})`} onNavigateToPremium={onNavigateToPremium}>
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
              </BlurredSection>
            )}

            {/* Different Songs - Premium Feature */}
            {metric?.key !== 'default' && mostDifferent.length > 0 && (
              <BlurredSection title={`Most Different (${metricLabel})`} onNavigateToPremium={onNavigateToPremium}>
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
              </BlurredSection>
            )}

            {/* Deep Dive Button */}
            <Pressable style={styles.deepDiveButton} onPress={() => setShowDeepDive(true)}>
              <Text style={styles.deepDiveButtonText}>Deep Dive</Text>
              <Text style={styles.deepDiveButtonArrow}>→</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* Deep Dive Overlay */}
      <SongDeepDive
        visible={showDeepDive}
        song={song}
        album={album}
        songs={songs}
        onClose={() => setShowDeepDive(false)}
      />
    </Modal>
  );
}

function AnimatedTile({ item, metric, suffix, isSmall, index, showOrder, onPress, isTrackFive, isVault, isContentMetric }) {
  const textColor = getContrastColor(item.color);
  const width = item.x1 - item.x0;
  const height = item.y1 - item.y0;
  const showValue = metric.key !== 'default' && width > 50 && height > 40;
  const nameFontSize = Math.max(Math.min(width / 7, height / 4, isSmall ? 14 : 18), 10);
  const valueFontSize = Math.max(Math.min(width / 9, height / 5, isSmall ? 11 : 13), 9);
  const orderFontSize = Math.max(Math.min(width / 10, height / 6, 11), 8);
  const showOrderNumber = showOrder && width > 40 && height > 35;

  // Content list display
  const hasContentList = isContentMetric && item.contentList && item.contentList.length > 0;
  const contentListFontSize = Math.max(Math.min(width / 12, height / 8, 10), 7);
  const maxContentItems = Math.floor((height - 50) / 14); // Estimate how many items fit

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
        <View style={[styles.tileOrder, { backgroundColor: getOverlayColor(textColor) }]}>
          <Text style={[styles.tileOrderText, { color: textColor, fontSize: orderFontSize }]}>
            {index + 1}
          </Text>
        </View>
      )}
      <Text style={[styles.tileName, { color: textColor, fontSize: nameFontSize }]} numberOfLines={2} adjustsFontSizeToFit>
        {item.name}
      </Text>
      {showValue && !hasContentList && (
        <Text style={[styles.tileValue, { color: textColor, fontSize: valueFontSize }]}>
          {item.metricValue.toLocaleString()}{suffix}
        </Text>
      )}
      {hasContentList && width > 60 && height > 60 && (
        <View style={styles.tileContentList}>
          {item.contentList.slice(0, Math.max(maxContentItems, 1)).map((contentItem, idx) => (
            <Text
              key={idx}
              style={[styles.tileContentItem, { color: textColor, fontSize: contentListFontSize }]}
              numberOfLines={1}
            >
              {contentItem}
            </Text>
          ))}
          {item.contentList.length > maxContentItems && maxContentItems > 0 && (
            <Text style={[styles.tileContentMore, { color: textColor, fontSize: contentListFontSize }]}>
              +{item.contentList.length - maxContentItems} more
            </Text>
          )}
        </View>
      )}
    </>
  );

  // Track 5 glow effect (subtle golden glow)
  const track5Style = isTrackFive ? {
    boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
    elevation: 8,
  } : {};

  // Vault track dashed border
  const vaultStyle = isVault ? {
    borderStyle: 'dashed',
    borderWidth: 2,
  } : {};

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
        track5Style,
        vaultStyle,
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

function AppContent() {
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('default');
  const [subModeIndex, setSubModeIndex] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [currentView, setCurrentView] = useState('treemap'); // 'treemap' | 'profile' | 'shared' | 'premium' | 'leaderboard'
  const [hasProfile, setHasProfile] = useState(false);
  const [sharedProfileId, setSharedProfileId] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState('taylor-swift');
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

  // Check if user has a profile
  useEffect(() => {
    loadProfile().then(profile => {
      setHasProfile(profile && profile.topAlbums?.length > 0);
    });
  }, [currentView]); // Re-check when returning from profile builder

  // Check for shared profile URL on mount
  useEffect(() => {
    const shareId = getShareIdFromPath();
    if (shareId) {
      setSharedProfileId(shareId);
      setCurrentView('shared');
    }
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !dataLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dataLoading]);

  const loading = !fontsLoaded || dataLoading;

  const currentMetric = ALL_METRICS.find(m => m.key === selectedMetric);
  const currentSubMode = currentMetric?.subModes?.[subModeIndex];
  const actualDataKey = currentSubMode?.key || selectedMetric;
  const currentSubLabel = currentSubMode?.subLabel || null;
  // Use subMode suffix if available, otherwise fall back to metric suffix
  const currentSuffix = currentSubMode?.suffix ?? currentMetric?.suffix ?? '';
  const treemapWidth = windowWidth - (padding * 2);
  const treemapHeight = Math.max(windowHeight - headerHeight, 300);

  const treemapData = useMemo(() => {
    if (treemapWidth <= 0 || treemapHeight <= 0) return [];

    // Helper to get metric value, including calculated vocabularyRichness
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

    // Drill-down mode: show songs from selected album
    if (selectedAlbum) {
      const albumSongs = songs.filter(s => s.album_id === selectedAlbum.id);
      if (albumSongs.length === 0) return [];

      let sortedSongs = [...albumSongs];
      if (sortBy === 'date') {
        sortedSongs.sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));
      } else if (sortBy === 'value' && selectedMetric !== 'default') {
        sortedSongs.sort((a, b) => getMetricValue(b) - getMetricValue(a));
      }

      const data = sortedSongs.map(song => {
        const metricValue = getMetricValue(song);
        return {
          id: song.id,
          name: song.name,
          value: selectedMetric === 'default' ? 100 : Math.max(metricValue || 1, 1),
          color: song.color || selectedAlbum.color || colors.fallback,
          metricValue,
          trackNumber: song.trackNumber,
          isVault: song.vaultTracks > 0,
          // Content lists for display
          contentList: getContentList(song, actualDataKey),
        };
      });

      const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
      return squarify(data, container);
    }

    // Album view
    if (albums.length === 0) return [];

    let sortedAlbums = [...albums];
    if (sortBy === 'date') {
      sortedAlbums.sort((a, b) => new Date(a.official_release_date) - new Date(b.official_release_date));
    } else if (sortBy === 'value' && selectedMetric !== 'default') {
      sortedAlbums.sort((a, b) => getMetricValue(b) - getMetricValue(a));
    }

    const data = sortedAlbums.map(album => {
      const metricValue = getMetricValue(album);
      return {
        id: album.id,
        name: album.display_name,
        value: selectedMetric === 'default' ? 100 : Math.max(metricValue || 1, 1),
        color: album.color || colors.fallback,
        metricValue,
        // Content lists for display
        contentList: getContentList(album, actualDataKey),
      };
    });

    const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
    return squarify(data, container);
  }, [albums, songs, selectedAlbum, selectedMetric, actualDataKey, sortBy, treemapWidth, treemapHeight]);

  // Album navigation helpers
  const sortedAlbumsForNav = useMemo(() => {
    return [...albums].sort((a, b) => new Date(a.official_release_date) - new Date(b.official_release_date));
  }, [albums]);

  const currentAlbumIndex = selectedAlbum
    ? sortedAlbumsForNav.findIndex(a => a.id === selectedAlbum.id)
    : -1;

  const isFirstAlbum = currentAlbumIndex === 0;
  const isLastAlbum = currentAlbumIndex === sortedAlbumsForNav.length - 1;

  const navigateAlbum = (direction) => {
    const newIndex = currentAlbumIndex + direction;
    if (newIndex >= 0 && newIndex < sortedAlbumsForNav.length) {
      setSelectedAlbum(sortedAlbumsForNav[newIndex]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
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

  // Show Shared Profile View
  if (currentView === 'shared' && sharedProfileId) {
    return (
      <SharedProfileView
        shareId={sharedProfileId}
        onClose={() => {
          setSharedProfileId(null);
          setCurrentView('treemap');
          navigateToHome();
        }}
        onCreateProfile={() => {
          setSharedProfileId(null);
          setCurrentView('profile');
          navigateToHome();
        }}
        onViewLeaderboard={() => {
          setCurrentView('leaderboard');
        }}
      />
    );
  }

  // Show Comparison Leaderboard
  if (currentView === 'leaderboard') {
    return (
      <ComparisonLeaderboard
        onClose={() => setCurrentView('treemap')}
        onViewProfile={(shareId) => {
          setSharedProfileId(shareId);
          setCurrentView('shared');
        }}
      />
    );
  }

  // Show Profile Builder
  if (currentView === 'profile') {
    return (
      <ProfileBuilder
        albums={albums}
        songs={songs}
        onClose={() => setCurrentView('treemap')}
        onViewLeaderboard={() => setCurrentView('leaderboard')}
        onShare={() => {
          // When user wants to share from comparison result,
          // we'll let them view the profile card which has share functionality
        }}
      />
    );
  }

  // Show Premium Page
  if (currentView === 'premium') {
    return (
      <PremiumPage
        onClose={() => setCurrentView('treemap')}
        onSuccess={() => {
          setCurrentView('treemap');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
      <View style={[styles.content, { paddingHorizontal: padding }]}>
        <View style={styles.titleRow}>
          {selectedAlbum ? (
            <>
              <View style={styles.albumNavContainer}>
                <Pressable
                  style={[styles.albumNavButton, isFirstAlbum && styles.albumNavButtonDisabled]}
                  onPress={() => navigateAlbum(-1)}
                  disabled={isFirstAlbum}
                >
                  <Text style={[styles.albumNavButtonText, isFirstAlbum && styles.albumNavButtonTextDisabled]}>‹</Text>
                </Pressable>
                <Text style={[styles.title, isSmall && styles.titleSmall, styles.albumNavTitle]} numberOfLines={1}>
                  {selectedAlbum.display_name}
                </Text>
                <Pressable
                  style={[styles.albumNavButton, isLastAlbum && styles.albumNavButtonDisabled]}
                  onPress={() => navigateAlbum(1)}
                  disabled={isLastAlbum}
                >
                  <Text style={[styles.albumNavButtonText, isLastAlbum && styles.albumNavButtonTextDisabled]}>›</Text>
                </Pressable>
              </View>
              <Pressable style={styles.backToAlbumsBtn} onPress={() => setSelectedAlbum(null)}>
                <Text style={styles.backToAlbumsBtnText}>Back to Albums</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.headerLeft}>
                <Text style={[styles.appName, isSmall && styles.appNameSmall]}>Music Besties</Text>
                <ArtistDropdown selected={selectedArtist} onSelect={setSelectedArtist} />
              </View>
              <Pressable style={styles.profileBtn} onPress={() => setCurrentView('profile')}>
                <Text style={styles.profileBtnText}>{hasProfile ? 'View Profile' : 'Create Profile'}</Text>
              </Pressable>
            </>
          )}
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
            disabledKeys={selectedAlbum ? SONG_DISABLED_METRICS : []}
          />
          <Dropdown label="Sort" options={getSortOptions(currentMetric, currentSubLabel, !selectedAlbum)} selected={sortBy} onSelect={setSortBy} disabledKeys={selectedMetric === "default" ? ["value"] : []} />
          <InfoButton metricKey={selectedMetric} />
        </View>

        <View style={[styles.treemapContainer, { width: treemapWidth, height: treemapHeight }]}>
          {treemapData.map((item, index) => (
            <AnimatedTile
              key={item.id || item.name}
              item={item}
              metric={currentMetric}
              suffix={currentSuffix}
              isSmall={isSmall}
              index={index}
              showOrder={sortBy === 'value' && selectedMetric !== 'default'}
              isTrackFive={selectedAlbum && item.trackNumber === 5}
              isVault={selectedAlbum && item.isVault}
              isContentMetric={['vaultTracks', 'coWriterCount', 'themeCount'].includes(actualDataKey)}
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
        onNavigateToPremium={() => {
          setSelectedSong(null); // Close the modal first
          setCurrentView('premium');
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const isAnonymous = useAuthStore((state) => state.user?.is_anonymous);
  const checkSubscription = useSubscriptionStore((state) => state.checkStatus);
  const isPremium = useSubscriptionStore((state) => state.isPremium);

  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'cancelled' | null

  // Initialize auth on app start
  useEffect(() => {
    initialize();
  }, []);

  // Check subscription when user changes
  useEffect(() => {
    if (user?.id) {
      checkSubscription(user.id);
    }
  }, [user?.id]);

  // Handle payment redirect
  useEffect(() => {
    const { payment } = getUrlParams();

    if (payment === 'success') {
      setPaymentStatus('success');
      // Refresh subscription status
      if (user?.id) {
        // Small delay to allow webhook to process
        setTimeout(() => {
          checkSubscription(user.id);
        }, 1500);
      }
      // Show link account prompt for anonymous users
      if (isAnonymous) {
        setTimeout(() => {
          setShowLinkPrompt(true);
        }, 2000);
      }
      clearUrlParams();
    } else if (payment === 'cancelled') {
      setPaymentStatus('cancelled');
      clearUrlParams();
      // Clear cancelled status after a moment
      setTimeout(() => setPaymentStatus(null), 3000);
    }
  }, [user?.id, isAnonymous]);

  // Show loading while auth initializes
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  // Show auth error if initialization failed
  if (authError && !user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{authError}</Text>
        <Pressable style={styles.retryButton} onPress={() => initialize()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <AppContent />

      {/* Payment success toast */}
      {paymentStatus === 'success' && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>Payment successful! Welcome to Premium.</Text>
        </View>
      )}

      {/* Payment cancelled toast */}
      {paymentStatus === 'cancelled' && (
        <View style={[styles.toast, styles.toastWarning]}>
          <Text style={styles.toastText}>Payment cancelled</Text>
        </View>
      )}

      {/* Link account prompt (shows after successful payment for anonymous users) */}
      <LinkAccountPrompt
        visible={showLinkPrompt}
        onDismiss={() => setShowLinkPrompt(false)}
      />
    </>
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
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    color: colors.text.primary,
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
    backgroundColor: colors.accent.primaryMuted,
  },
  backButtonText: {
    color: colors.accent.primary,
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  albumNavContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  albumNavButtonDisabled: {
    opacity: 0.3,
  },
  albumNavButtonText: {
    color: colors.accent.primary,
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
  },
  albumNavButtonTextDisabled: {
    color: colors.text.muted,
  },
  albumNavTitle: {
    flex: 0,
    marginBottom: 0,
    marginHorizontal: 8,
    maxWidth: '60%',
  },
  backToAlbumsBtn: {
    backgroundColor: colors.accent.primaryMuted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
  },
  backToAlbumsBtnText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 9,
    color: colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Header styles for Music Besties
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_800ExtraBold',
  },
  appNameSmall: {
    fontSize: 15,
  },
  // Artist dropdown styles
  artistDropdownWrapper: {
    position: 'relative',
  },
  artistDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.surface.medium,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  artistName: {
    color: colors.accent.primary,
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
  },
  artistDropdownArrow: {
    color: colors.text.muted,
    fontSize: 8,
  },
  artistDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    minWidth: 160,
    marginTop: 4,
    backgroundColor: colors.surface.heavy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.medium,
    overflow: 'hidden',
    zIndex: 100,
  },
  artistDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  artistDropdownItemActive: {
    backgroundColor: colors.accent.primaryMuted,
  },
  artistDropdownItemDisabled: {
    opacity: 0.5,
  },
  artistDropdownItemText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
  },
  artistDropdownItemTextActive: {
    color: colors.accent.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  artistDropdownItemTextDisabled: {
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
  // Info button styles
  infoButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surface.medium,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  infoButtonText: {
    color: colors.accent.primary,
    fontSize: 14,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModalContent: {
    backgroundColor: colors.bg.card,
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  infoModalTitle: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 12,
  },
  infoModalDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoModalClose: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoModalCloseText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },
  // View modal styles (larger selection area)
  viewModalOverlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewModalContent: {
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  viewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  viewModalTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  viewModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalCloseText: {
    fontSize: 20,
    color: colors.text.secondary,
  },
  viewModalScroll: {
    padding: 16,
  },
  viewModalGroup: {
    marginBottom: 20,
  },
  viewModalGroupTitle: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  viewModalItems: {
    gap: 8,
  },
  viewModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  viewModalItemActive: {
    backgroundColor: colors.accent.primaryMuted,
    borderColor: colors.accent.primaryBorder,
  },
  viewModalItemDisabled: {
    opacity: 0.4,
  },
  viewModalItemContent: {
    flex: 1,
  },
  viewModalItemText: {
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: colors.text.primary,
  },
  viewModalItemTextActive: {
    color: colors.accent.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  viewModalItemTextDisabled: {
    color: colors.text.disabled,
  },
  viewModalItemSubLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
    marginTop: 2,
  },
  viewModalCheck: {
    fontSize: 16,
    color: colors.accent.primary,
    marginLeft: 8,
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
    backgroundColor: colors.surface.medium,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  dropdownLabel: {
    color: colors.text.muted,
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
    color: colors.accent.primary,
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dropdownSubLabel: {
    color: colors.text.secondary,
    fontSize: 8,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'lowercase',
  },
  dropdownArrow: {
    color: colors.text.muted,
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
    backgroundColor: colors.surface.heavy,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.medium,
    overflow: 'hidden',
  },
  dropdownGroupLabel: {
    color: colors.text.disabled,
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
    backgroundColor: colors.accent.primaryMuted,
  },
  dropdownItemText: {
    color: colors.text.secondary,
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dropdownItemTextActive: {
    color: colors.accent.primary,
  },
  dropdownItemDisabled: {
    opacity: 0.3,
  },
  dropdownItemTextDisabled: {
    color: colors.text.disabled,
  },
  dropdownItemSubLabel: {
    color: colors.text.muted,
    fontSize: 8,
    fontFamily: 'JetBrainsMono_400Regular',
    marginLeft: 4,
  },
  treemapContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  tile: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1.5,
    borderColor: colors.border.tile,
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
  tileContentList: {
    marginTop: 4,
    alignItems: 'center',
    width: '100%',
  },
  tileContentItem: {
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 14,
  },
  tileContentMore: {
    fontFamily: 'JetBrainsMono_400Regular',
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 2,
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: colors.text.muted,
    letterSpacing: 2,
  },
  profileBtn: {
    backgroundColor: colors.accent.primaryMuted,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
  },
  profileBtnText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 9,
    color: colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.border.medium,
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
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
  },
  modalClose: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: colors.text.secondary,
    fontFamily: 'Outfit_300Light',
  },
  deepDiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primaryMuted,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  deepDiveButtonText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  deepDiveButtonArrow: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.accent.primary,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 10,
    color: colors.text.muted,
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
    backgroundColor: colors.accent.primaryMuted,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 24,
    color: colors.accent.primary,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  rankTotal: {
    fontSize: 10,
    color: colors.text.muted,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  rankStats: {
    flex: 1,
  },
  rankValue: {
    fontSize: 16,
    color: colors.text.primary,
    fontFamily: 'JetBrainsMono_700Bold',
    marginBottom: 2,
  },
  rankPercentile: {
    fontSize: 12,
    color: colors.accent.primary,
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
    backgroundColor: colors.surface.medium,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  quickStatValue: {
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  quickStatLabel: {
    fontSize: 8,
    color: colors.text.muted,
    fontFamily: 'JetBrainsMono_400Regular',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  vaultBadge: {
    backgroundColor: colors.semantic.warningMuted,
    borderColor: colors.semantic.warningBorder,
  },
  vaultText: {
    fontSize: 10,
    color: colors.semantic.warning,
    fontFamily: 'JetBrainsMono_700Bold',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
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
    color: colors.text.primary,
    fontFamily: 'Outfit_400Regular',
  },
  songAlbum: {
    fontSize: 10,
    color: colors.text.muted,
    fontFamily: 'Outfit_300Light',
  },
  songValue: {
    fontSize: 11,
    color: colors.accent.primary,
    fontFamily: 'JetBrainsMono_400Regular',
  },

  // Toast notifications
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: colors.semantic.success,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  toastWarning: {
    backgroundColor: colors.semantic.warning,
  },
  toastText: {
    color: colors.text.inverse,
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
  },

  // Error state
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    color: colors.text.primary,
    fontFamily: 'Outfit_600SemiBold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontFamily: 'Outfit_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  retryButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    color: colors.text.inverse,
    fontFamily: 'Outfit_600SemiBold',
  },
});
