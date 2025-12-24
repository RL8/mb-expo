import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors, getContrastColor } from '../lib/theme';
import { getCompatibilityLabel } from '../lib/compatibility';

/**
 * ComparisonResult - Shows the result of comparing with another profile
 *
 * Displayed after onboarding when user came from a shared profile link.
 * Celebrates the comparison and encourages sharing.
 *
 * @param {number} score - Compatibility score 0-100
 * @param {object} breakdown - Array of {text, positive} items
 * @param {object} theirProfile - The profile that was compared with
 * @param {function} onViewProfile - View your own profile
 * @param {function} onShare - Share your profile
 * @param {function} onViewLeaderboard - Go to leaderboard
 */
export default function ComparisonResult({
  score,
  breakdown = [],
  theirProfile,
  onViewProfile,
  onShare,
  onViewLeaderboard,
}) {
  const { label, emoji } = getCompatibilityLabel(score);

  // Get their #1 album info for display
  const theirFirstAlbum = theirProfile?.topAlbums?.[0];
  const theirAlbumName = theirProfile?.albumNames?.[theirFirstAlbum] || 'Unknown';
  const theirAlbumColor = theirProfile?.albumColors?.[theirFirstAlbum] || colors.accent.primary;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Celebration header */}
        <View style={styles.header}>
          <Text style={styles.celebrationEmoji}>{emoji}</Text>
          <Text style={styles.title}>You matched!</Text>
        </View>

        {/* Score display */}
        <View style={styles.scoreSection}>
          <Text style={styles.scoreText}>{score}%</Text>
          <Text style={styles.labelText}>{label}</Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${score}%` }]} />
            </View>
          </View>
        </View>

        {/* Compared with */}
        <View style={styles.comparedWith}>
          <Text style={styles.comparedWithLabel}>Compared with</Text>
          <View style={styles.theirProfile}>
            <View style={[styles.albumDot, { backgroundColor: theirAlbumColor }]} />
            <Text style={styles.theirAlbumText}>{theirAlbumName} fan</Text>
          </View>
        </View>

        {/* Breakdown */}
        <View style={styles.breakdown}>
          {breakdown.slice(0, 3).map((item, idx) => (
            <View key={idx} style={styles.breakdownItem}>
              <Text style={[styles.breakdownIcon, !item.positive && styles.breakdownIconNegative]}>
                {item.positive ? '✓' : '✗'}
              </Text>
              <Text style={[styles.breakdownText, !item.positive && styles.breakdownTextMuted]}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA section */}
        <View style={styles.ctaSection}>
          <Text style={styles.ctaText}>
            Share your profile to find more matches!
          </Text>

          <Pressable style={styles.primaryBtn} onPress={onShare}>
            <Text style={styles.primaryBtnText}>Share Your Profile</Text>
          </Pressable>

          <View style={styles.secondaryBtns}>
            <Pressable style={styles.secondaryBtn} onPress={onViewProfile}>
              <Text style={styles.secondaryBtnText}>View Profile</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onViewLeaderboard}>
              <Text style={styles.secondaryBtnText}>Leaderboard</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.bg.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Outfit_800ExtraBold',
    color: colors.text.primary,
  },

  // Score
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 56,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
  },
  labelText: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.secondary,
    marginTop: 4,
  },
  progressContainer: {
    width: '100%',
    marginTop: 16,
  },
  progressBg: {
    height: 8,
    backgroundColor: colors.surface.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 4,
  },

  // Compared with
  comparedWith: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
  },
  comparedWithLabel: {
    fontSize: 10,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  theirProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  albumDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  theirAlbumText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },

  // Breakdown
  breakdown: {
    marginBottom: 24,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownIcon: {
    width: 24,
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.semantic.success,
  },
  breakdownIconNegative: {
    color: colors.text.muted,
  },
  breakdownText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
  },
  breakdownTextMuted: {
    color: colors.text.muted,
  },

  // CTA
  ctaSection: {
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface.medium,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.secondary,
  },
});
