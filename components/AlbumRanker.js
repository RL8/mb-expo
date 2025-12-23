import { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import squarify from 'squarify';

function getContrastColor(hexColor) {
  if (!hexColor) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export default function AlbumRanker({ albums, ranking, onRankingChange }) {
  const { width: windowWidth } = useWindowDimensions();
  const padding = 16;
  const treemapWidth = windowWidth - (padding * 2);
  const treemapHeight = 400;

  const handleAlbumTap = (albumId) => {
    const currentIndex = ranking.indexOf(albumId);

    if (currentIndex >= 0) {
      // Already selected - remove it
      onRankingChange(ranking.filter(id => id !== albumId));
    } else if (ranking.length < 3) {
      // Add to ranking
      onRankingChange([...ranking, albumId]);
    }
    // If already have 3, ignore tap on unselected albums
  };

  const getRank = (albumId) => {
    const idx = ranking.indexOf(albumId);
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
        {ranking.length}/3 selected · Tap to rank
      </Text>

      <View style={[styles.treemapContainer, { width: treemapWidth, height: treemapHeight, marginHorizontal: padding }]}>
        {treemapData.map((item) => {
          const rank = getRank(item.id);
          const isSelected = rank !== null;
          const textColor = getContrastColor(item.color);
          const width = item.x1 - item.x0;
          const height = item.y1 - item.y0;
          const fontSize = Math.max(Math.min(width / 8, height / 4, 16), 11);

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
                  opacity: ranking.length >= 3 && !isSelected ? 0.4 : 1,
                },
                isSelected && styles.tileSelected,
              ]}
              onPress={() => handleAlbumTap(item.id)}
            >
              {isSelected && (
                <View style={[styles.rankBadge, { backgroundColor: textColor === '#000000' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)' }]}>
                  <Text style={[styles.rankText, { color: textColor === '#000000' ? '#fff' : '#000' }]}>
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

      {ranking.length > 0 && (
        <View style={styles.selectionPreview}>
          <Text style={styles.selectionLabel}>Your ranking:</Text>
          <View style={styles.selectionRow}>
            {ranking.map((albumId, idx) => {
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
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#38bdf8',
    textAlign: 'center',
    marginBottom: 16,
  },
  treemapContainer: {
    position: 'relative',
    borderRadius: 16,
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
    borderRadius: 6,
  },
  tileSelected: {
    borderColor: '#38bdf8',
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
    color: 'rgba(148, 163, 184, 0.5)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
    color: '#fff',
  },
  selectionName: {
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: '#e2e8f0',
  },
});
