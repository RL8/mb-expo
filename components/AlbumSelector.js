import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import squarify from 'squarify';
import { colors, getContrastColor, getBadgeBackground, getBadgeTextColor } from '../lib/theme';

/**
 * AlbumSelector - Treemap-based album selection for onboarding
 *
 * Users tap albums to select their top 3. Selection order = ranking order.
 * Shows edit warning for free users.
 *
 * @param {Array} albums - All albums
 * @param {Array} selectedAlbums - Currently selected album IDs (ordered)
 * @param {function} onSelectionChange - Called with new selection array
 * @param {boolean} isEditing - Whether user is editing existing selection
 * @param {number} editsRemaining - Number of edits remaining (0 = locked)
 */
export default function AlbumSelector({
  albums,
  selectedAlbums = [],
  onSelectionChange,
  isEditing = false,
  editsRemaining = 1,
}) {
  const { width: windowWidth } = useWindowDimensions();
  const padding = 16;
  const treemapWidth = windowWidth - (padding * 2);
  const treemapHeight = 400;

  const handleAlbumTap = (albumId) => {
    const currentIndex = selectedAlbums.indexOf(albumId);

    if (currentIndex >= 0) {
      // Already selected - remove it
      onSelectionChange(selectedAlbums.filter(id => id !== albumId));
    } else if (selectedAlbums.length < 3) {
      // Add to selection
      onSelectionChange([...selectedAlbums, albumId]);
    }
    // If already have 3, ignore tap on unselected albums
  };

  const getRank = (albumId) => {
    const idx = selectedAlbums.indexOf(albumId);
    return idx >= 0 ? idx + 1 : null;
  };

  // Sort albums chronologically
  const sortedAlbums = useMemo(() => {
    return [...albums].sort((a, b) =>
      new Date(a.official_release_date) - new Date(b.official_release_date)
    );
  }, [albums]);

  // Create treemap data - equal sizes
  const treemapData = useMemo(() => {
    if (treemapWidth <= 0 || treemapHeight <= 0) return [];

    const data = sortedAlbums.map(album => ({
      ...album,
      value: 100, // Equal sizes
    }));

    const container = { x0: 0, y0: 0, x1: treemapWidth, y1: treemapHeight };
    return squarify(data, container);
  }, [sortedAlbums, treemapWidth, treemapHeight]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick Your Top 3 Albums</Text>
      <Text style={styles.subtitle}>
        {selectedAlbums.length}/3 selected · Tap to rank
      </Text>

      {/* Edit warning */}
      {isEditing && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            {editsRemaining > 0
              ? `This is your ${editsRemaining === 1 ? 'one remaining' : 'free'} edit. After this, subscribe for more changes.`
              : 'Subscribe to change your selection.'}
          </Text>
        </View>
      )}

      {/* Treemap */}
      <View style={[styles.treemapContainer, { width: treemapWidth, height: treemapHeight, marginHorizontal: padding }]}>
        {treemapData.map((item) => {
          const rank = getRank(item.id);
          const isSelected = rank !== null;
          const textColor = getContrastColor(item.color);
          const width = item.x1 - item.x0;
          const height = item.y1 - item.y0;
          const fontSize = Math.max(Math.min(width / 8, height / 4, 16), 11);
          const isDisabled = !isSelected && selectedAlbums.length >= 3;

          return (
            <Pressable
              key={item.id}
              style={[
                styles.tile,
                {
                  left: item.x0,
                  top: item.y0,
                  width,
                  height,
                  backgroundColor: item.color,
                  opacity: isDisabled ? 0.4 : 1,
                },
                isSelected && styles.tileSelected,
              ]}
              onPress={() => handleAlbumTap(item.id)}
            >
              {isSelected && (
                <View style={[styles.rankBadge, { backgroundColor: getBadgeBackground(textColor) }]}>
                  <Text style={[styles.rankText, { color: getBadgeTextColor(textColor) }]}>
                    {rank}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.tileName, { color: textColor, fontSize }]}
                numberOfLines={2}
              >
                {item.display_name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Selection preview */}
      {selectedAlbums.length > 0 && (
        <View style={styles.selectionPreview}>
          <Text style={styles.selectionLabel}>Your ranking:</Text>
          <View style={styles.selectionRow}>
            {selectedAlbums.map((albumId, idx) => {
              const album = albums.find(a => a.id === albumId);
              return (
                <View key={albumId} style={styles.selectionItem}>
                  <View style={[styles.selectionDot, { backgroundColor: album?.color }]}>
                    <Text style={styles.selectionNum}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.selectionName} numberOfLines={1}>
                    {album?.display_name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* First time info */}
      {!isEditing && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 You can change this once more after saving. Subscribe for unlimited changes.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.accent.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.warningMuted,
    borderWidth: 1,
    borderColor: colors.semantic.warningBorder,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.semantic.warning,
  },
  treemapContainer: {
    position: 'relative',
    borderRadius: 16,
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
    borderRadius: 6,
  },
  tileSelected: {
    borderColor: colors.accent.primary,
    borderWidth: 3,
  },
  tileName: {
    fontFamily: 'Outfit_600SemiBold',
    textAlign: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
  },
  selectionPreview: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  selectionLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  selectionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.medium,
    borderRadius: 8,
    padding: 8,
  },
  selectionDot: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  selectionNum: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 10,
    color: colors.contrast.light,
  },
  selectionName: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.text.primary,
  },
  infoBox: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: colors.surface.light,
    borderRadius: 10,
    padding: 12,
  },
  infoText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
