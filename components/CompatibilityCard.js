import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors } from '../lib/theme';
import { getCompatibilityLabel } from '../lib/compatibility';

/**
 * CompatibilityCard - Shows compatibility score with breakdown
 *
 * @param {number} score - Compatibility score 0-100
 * @param {object} breakdown - Array of {text, positive} items
 * @param {number} comparisonCount - How many comparisons user has made
 * @param {function} onViewLeaderboard - Called when "View Leaderboard" tapped
 */
export default function CompatibilityCard({
  score,
  breakdown = [],
  comparisonCount = 0,
  onViewLeaderboard,
}) {
  const { label, emoji } = getCompatibilityLabel(score);

  return (
    <View style={styles.container}>
      {/* Score header */}
      <View style={styles.scoreSection}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.scoreText}>{score}%</Text>
        <Text style={styles.labelText}>{label}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${score}%` }]} />
        </View>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        {breakdown.slice(0, 4).map((item, idx) => (
          <View key={idx} style={styles.breakdownItem}>
            <Text style={styles.breakdownIcon}>
              {item.positive ? '✓' : '✗'}
            </Text>
            <Text style={[
              styles.breakdownText,
              !item.positive && styles.breakdownTextNegative,
            ]}>
              {item.text}
            </Text>
          </View>
        ))}
      </View>

      {/* View Leaderboard CTA */}
      <Pressable style={styles.leaderboardBtn} onPress={onViewLeaderboard}>
        <Text style={styles.leaderboardBtnText}>View Leaderboard</Text>
        {comparisonCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{comparisonCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/**
 * NoProfileCard - Shown when visitor doesn't have a profile
 */
export function NoProfileCard({ onCreateProfile }) {
  return (
    <View style={styles.noProfileContainer}>
      <Text style={styles.noProfileEmoji}>🎵</Text>
      <Text style={styles.noProfileTitle}>Think you have better taste?</Text>
      <Text style={styles.noProfileText}>
        Create your profile to see how you compare
      </Text>
      <Pressable style={styles.createBtn} onPress={onCreateProfile}>
        <Text style={styles.createBtnText}>Create Yours to Compare</Text>
      </Pressable>
    </View>
  );
}

/**
 * SharePromptCard - Shown when user has profile but no share ID
 */
export function SharePromptCard({ onCreateShareLink, isLoading }) {
  return (
    <View style={styles.sharePromptContainer}>
      <Text style={styles.sharePromptTitle}>Share to unlock comparisons</Text>
      <Text style={styles.sharePromptText}>
        Create a share link to:
      </Text>
      <View style={styles.benefitsList}>
        <Text style={styles.benefitItem}>• See who compares with you</Text>
        <Text style={styles.benefitItem}>• Build your leaderboard</Text>
        <Text style={styles.benefitItem}>• Get notified of new matches</Text>
      </View>
      <Pressable
        style={[styles.shareBtn, isLoading && styles.shareBtnDisabled]}
        onPress={onCreateShareLink}
        disabled={isLoading}
      >
        <Text style={styles.shareBtnText}>
          {isLoading ? 'Creating...' : 'Create Share Link'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.medium,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },

  // Score section
  scoreSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 36,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.accent.primary,
  },
  labelText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Progress bar
  progressContainer: {
    marginBottom: 16,
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

  // Breakdown
  breakdown: {
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownIcon: {
    width: 20,
    fontSize: 12,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.semantic.success,
  },
  breakdownText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
  },
  breakdownTextNegative: {
    color: colors.text.muted,
  },

  // Leaderboard button
  leaderboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.primaryMuted,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
  },
  leaderboardBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.accent.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    marginLeft: 8,
    backgroundColor: colors.accent.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
  },

  // No profile card
  noProfileContainer: {
    backgroundColor: colors.surface.medium,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  noProfileEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  noProfileTitle: {
    fontSize: 18,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  noProfileText: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  createBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Share prompt card
  sharePromptContainer: {
    backgroundColor: colors.surface.medium,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.accent.primaryBorder,
  },
  sharePromptTitle: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  sharePromptText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  benefitsList: {
    marginBottom: 16,
  },
  benefitItem: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  shareBtn: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  shareBtnDisabled: {
    opacity: 0.6,
  },
  shareBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
