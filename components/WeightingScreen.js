import { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { colors } from '../lib/theme';
import { allocateToItems, normalizeWeights, WEIGHT_PRESETS } from '../lib/weighting';

/**
 * WeightingScreen - Captures preference intensity after ranking
 *
 * Flow:
 * 1. User selects a preset curve (Balanced / One Favorite / Top 3)
 * 2. User can Refine (adjust sliders) or Skip (use preset as-is)
 * 3. In refine mode, sliders allow adjustment while maintaining 100 total
 */

const PRESET_ICONS = {
  balanced: '\u2581\u2582\u2583\u2584\u2585\u2586',
  oneFavorite: '\u2588\u2582\u2581\u2581\u2581\u2581',
  topHeavy: '\u2588\u2588\u2588\u2583\u2582\u2581',
};

export default function WeightingScreen({
  type = 'albums', // 'albums' | 'songs'
  items = [],      // Array of { id, name, color? }
  onComplete,      // (weights, preset) => void
  onBack,
  onSkip,          // Skip refinement, use preset
}) {
  const [selectedPreset, setSelectedPreset] = useState('balanced');
  const [isRefining, setIsRefining] = useState(false);
  const [weights, setWeights] = useState(() => {
    const ids = items.map(item => item.id);
    return allocateToItems(ids, 'balanced');
  });

  // Generate initial weights when preset changes
  const handlePresetChange = useCallback((preset) => {
    setSelectedPreset(preset);
    const ids = items.map(item => item.id);
    setWeights(allocateToItems(ids, preset));
  }, [items]);

  // Adjust a single weight, rebalancing others proportionally
  const handleWeightChange = useCallback((itemId, newValue) => {
    setWeights(prev => {
      const oldValue = prev[itemId];
      const delta = newValue - oldValue;

      if (delta === 0) return prev;

      // Calculate how much we need to take from/give to others
      const otherIds = Object.keys(prev).filter(id => id !== itemId);
      const otherTotal = otherIds.reduce((sum, id) => sum + prev[id], 0);

      if (otherTotal === 0 && delta > 0) {
        // Can't take from others if they're all 0
        return prev;
      }

      const newWeights = { ...prev, [itemId]: newValue };

      // Distribute the delta proportionally among others
      otherIds.forEach(id => {
        const proportion = prev[id] / otherTotal;
        const adjustment = Math.round(delta * proportion);
        newWeights[id] = Math.max(1, prev[id] - adjustment);
      });

      // Normalize to ensure sum is exactly 100
      return normalizeWeights(newWeights);
    });
  }, []);

  const handleRefine = () => {
    setIsRefining(true);
  };

  const handleDone = () => {
    onComplete(weights, selectedPreset);
  };

  const handleSkipPress = () => {
    if (onSkip) {
      onSkip(weights, selectedPreset);
    } else {
      onComplete(weights, selectedPreset);
    }
  };

  const totalPoints = useMemo(() => {
    return Object.values(weights).reduce((sum, v) => sum + v, 0);
  }, [weights]);

  const title = type === 'albums' ? 'Weight Your Albums' : 'Weight Your Songs';
  const subtitle = isRefining
    ? 'Drag sliders to match how you really feel'
    : 'How strong are your preferences?';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {!isRefining ? (
        // Preset Selection Mode
        <View style={styles.presetContainer}>
          {Object.values(WEIGHT_PRESETS).map((preset) => (
            <Pressable
              key={preset.key}
              style={[
                styles.presetCard,
                selectedPreset === preset.key && styles.presetCardSelected,
              ]}
              onPress={() => handlePresetChange(preset.key)}
            >
              <Text style={styles.presetIcon}>{PRESET_ICONS[preset.key]}</Text>
              <Text style={[
                styles.presetLabel,
                selectedPreset === preset.key && styles.presetLabelSelected,
              ]}>
                {preset.label}
              </Text>
              <Text style={styles.presetDescription}>{preset.description}</Text>
            </Pressable>
          ))}

          {/* Preview of allocation */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Preview</Text>
            {items.map((item, index) => (
              <View key={item.id} style={styles.previewRow}>
                <Text style={styles.previewRank}>{index + 1}.</Text>
                <Text style={styles.previewName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.previewBarContainer}>
                  <View
                    style={[
                      styles.previewBar,
                      {
                        width: `${weights[item.id] || 0}%`,
                        backgroundColor: item.color || colors.accent.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.previewPoints}>{weights[item.id] || 0}</Text>
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <Pressable style={styles.refineBtn} onPress={handleRefine}>
              <Text style={styles.refineBtnText}>Refine</Text>
            </Pressable>
            <Pressable style={styles.skipBtn} onPress={handleSkipPress}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        // Refine Mode with Sliders
        <ScrollView style={styles.refineContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[
              styles.totalValue,
              totalPoints !== 100 && styles.totalValueWarning,
            ]}>
              {totalPoints}/100
            </Text>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={styles.sliderRow}>
              <View style={styles.sliderHeader}>
                <Text style={styles.sliderRank}>{index + 1}.</Text>
                <Text style={styles.sliderName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.adjustRow}>
                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => handleWeightChange(item.id, Math.max(1, (weights[item.id] || 0) - 5))}
                >
                  <Text style={styles.adjustBtnText}>-</Text>
                </Pressable>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${weights[item.id] || 0}%`,
                        backgroundColor: item.color || colors.accent.primary,
                      },
                    ]}
                  />
                  <Text style={styles.barValue}>{weights[item.id] || 0}</Text>
                </View>
                <Pressable
                  style={styles.adjustBtn}
                  onPress={() => handleWeightChange(item.id, Math.min(99, (weights[item.id] || 0) + 5))}
                >
                  <Text style={styles.adjustBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.refineButtonContainer}>
            <Pressable style={styles.backToPresetBtn} onPress={() => setIsRefining(false)}>
              <Text style={styles.backToPresetBtnText}>Back to Presets</Text>
            </Pressable>
            <Pressable style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* Back button */}
      {onBack && !isRefining && (
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Change Ranking</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },

  // Preset Selection
  presetContainer: {
    flex: 1,
  },
  presetCard: {
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primaryMuted,
  },
  presetIcon: {
    fontSize: 20,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    marginBottom: 8,
    letterSpacing: 2,
  },
  presetLabel: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  presetLabelSelected: {
    color: colors.accent.primary,
  },
  presetDescription: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
  },

  // Preview
  previewContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.surface.medium,
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewRank: {
    width: 24,
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
  },
  previewName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.primary,
    marginRight: 8,
  },
  previewBarContainer: {
    width: 80,
    height: 8,
    backgroundColor: colors.surface.light,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  previewBar: {
    height: '100%',
    borderRadius: 4,
  },
  previewPoints: {
    width: 28,
    fontSize: 12,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.secondary,
    textAlign: 'right',
  },

  // Buttons
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  refineBtn: {
    flex: 1,
    backgroundColor: colors.surface.medium,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  refineBtnText: {
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Refine Mode
  refineContainer: {
    flex: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.primary,
  },
  totalValueWarning: {
    color: colors.semantic.warning,
  },
  sliderRow: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderRank: {
    width: 24,
    fontSize: 14,
    fontFamily: 'JetBrainsMono_400Regular',
    color: colors.text.muted,
  },
  sliderName: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Outfit_500Medium',
    color: colors.text.primary,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: 20,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  barContainer: {
    flex: 1,
    height: 36,
    backgroundColor: colors.surface.light,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    opacity: 0.6,
  },
  barValue: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.primary,
    textAlign: 'center',
  },
  refineButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  backToPresetBtn: {
    flex: 1,
    backgroundColor: colors.surface.light,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backToPresetBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.secondary,
  },
  doneBtn: {
    flex: 1,
    backgroundColor: colors.accent.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontFamily: 'JetBrainsMono_700Bold',
    color: colors.text.inverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Back button
  backBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
});
