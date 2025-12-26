import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { colors, getContrastColor } from '../lib/theme';
import { loadComparisons, loadShareId, loadLastSeenComparisons, saveLastSeenComparisons } from '../lib/storage';
import { fetchIncomingComparisons } from '../lib/supabase';
import { getCompatibilityLabel } from '../lib/compatibility';

/**
 * ComparisonLeaderboard - Shows ranked list of profile comparisons
 *
 * Two sections:
 * 1. "Compared with you" - incoming comparisons (people who viewed your profile)
 * 2. "Your comparisons" - outgoing comparisons (profiles you've viewed)
 *
 * @param {function} onClose - Called when closing leaderboard
 * @param {function} onViewProfile - Called with shareId when tapping a comparison
 */
export default function ComparisonLeaderboard({ onClose, onViewProfile }) {
  const [myComparisons, setMyComparisons] = useState([]);
  const [incomingComparisons, setIncomingComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outgoing'); // 'outgoing' | 'incoming'
  const [myShareId, setMyShareId] = useState(null);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        // Load local comparisons (profiles I've viewed)
        const local = await loadComparisons();
        // Sort by score descending
        const sorted = [...local].sort((a, b) => b.score - a.score);
        setMyComparisons(sorted);

        // Load share ID and incoming comparisons
        const shareId = await loadShareId();
        setMyShareId(shareId);

        if (shareId) {
          const lastSeen = await loadLastSeenComparisons();
          const incoming = await fetchIncomingComparisons(shareId);

          // Count new comparisons
          if (lastSeen) {
            const newOnes = incoming.filter(c => c.created_at > lastSeen);
            setNewCount(newOnes.length);
          } else {
            setNewCount(incoming.length);
          }

          // Sort by score descending
          const sortedIncoming = [...incoming].sort((a, b) => b.score - a.score);
          setIncomingComparisons(sortedIncoming);

          // Mark as seen
          await saveLastSeenComparisons(new Date().toISOString());
        }
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return null;
  };

  const renderComparison = (item, index, isIncoming = false) => {
    const medal = getMedalEmoji(index);
    const { label } = getCompatibilityLabel(item.score);
    const albumId = isIncoming
      ? item.viewer_albums?.[0]
      : item.theirAlbums?.[0];
    const albumName = isIncoming
      ? item.viewer_album_names?.[albumId]
      : item.albumNames?.[albumId];
    const albumColor = item.albumColors?.[albumId] || colors.accent.primary;

    return (
      <Pressable
        key={isIncoming ? item.viewer_share_id : item.shareId}
        style={styles.comparisonItem}
        onPress={() => onViewProfile?.(isIncoming ? item.viewer_share_id : item.shareId)}
      >
        <View style={styles.comparisonLeft}>
          {medal && <Text style={styles.medal}>{medal}</Text>}
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{item.score}%</Text>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${item.score}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.comparisonRight}>
          <View style={styles.albumInfo}>
            <View style={[styles.albumDot, { backgroundColor: albumColor }]} />
            <Text style={styles.albumText} numberOfLines={1}>
              {albumName || 'Unknown'} #1
            </Text>
          </View>
          <Text style={styles.dateText}>
            {formatDate(isIncoming ? item.created_at : item.comparedAt)}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>×</Text>
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </View>
    );
  }

  const currentList = activeTab === 'outgoing' ? myComparisons : incomingComparisons;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onClose}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'outgoing' && styles.tabActive]}
          onPress={() => setActiveTab('outgoing')}
        >
          <Text style={[styles.tabText, activeTab === 'outgoing' && styles.tabTextActive]}>
            Your Comparisons
          </Text>
          {myComparisons.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{myComparisons.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'incoming' && styles.tabActive]}
          onPress={() => setActiveTab('incoming')}
        >
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.tabTextActive]}>
            Compared With You
          </Text>
          {incomingComparisons.length > 0 && (
            <View style={[styles.tabBadge, newCount > 0 && styles.tabBadgeNew]}>
              <Text style={styles.tabBadgeText}>{incomingComparisons.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {currentList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>
              {activeTab === 'outgoing' ? '🔍' : '📬'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'outgoing'
                ? 'No comparisons yet'
                : 'No one has compared with you yet'
              }
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'outgoing'
                ? 'View other Swifties\' profiles to see your compatibility!'
                : 'Share your profile link to get more comparisons!'
              }
            </Text>
          </View>
        ) : (
          <>
            {currentList.map((item, index) =>
              renderComparison(item, index, activeTab === 'incoming')
            )}

            {/* Share encouragement at bottom */}
            {activeTab === 'outgoing' && myComparisons.length < 5 && (
              <View style={styles.encouragement}>
                <Text style={styles.encouragementText}>
                  Compare with more Swifties to find your best matches!
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 20,
    color: colors.text.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.contrast.lightOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 20,
    color: colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surface.medium,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.accent.primaryMuted,
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.accent.primary,
  },
  tabBadge: {
    backgroundColor: colors.surface.light,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeNew: {
    backgroundColor: colors.accent.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.secondary,
  },

  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Comparison item
  comparisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  comparisonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medal: {
    fontSize: 20,
    width: 28,
  },
  scoreContainer: {
    alignItems: 'flex-start',
    gap: 4,
  },
  scoreText: {
    fontSize: 18,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
  },
  progressBg: {
    width: 60,
    height: 4,
    backgroundColor: colors.surface.light,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
  },
  comparisonRight: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  albumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  albumDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  albumText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
  },
  dateText: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    marginTop: 4,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Encouragement
  encouragement: {
    marginTop: 8,
    padding: 16,
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  encouragementText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
  },

  bottomPadding: {
    height: 40,
  },
});
