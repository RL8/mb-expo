import { memo, useCallback } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors, getContrastColor, getOverlayColor } from '../lib/theme';

function AnimatedTile({
  item,
  metric,
  suffix,
  isSmall,
  index,
  showOrder,
  onPress,
  onLongPress,
  isTrackFive,
  isVault,
  isContentMetric,
}) {
  const textColor = getContrastColor(item.color);
  const width = item.x1 - item.x0;
  const height = item.y1 - item.y0;
  const showValue = metric?.key !== 'default' && width > 50 && height > 40;
  const nameFontSize = Math.max(Math.min(width / 7, height / 4, isSmall ? 14 : 18), 10);
  const valueFontSize = Math.max(Math.min(width / 9, height / 5, isSmall ? 11 : 13), 9);
  const orderFontSize = Math.max(Math.min(width / 10, height / 6, 11), 8);
  const showOrderNumber = showOrder && width > 40 && height > 35;

  // Content list display
  const hasContentList = isContentMetric && item.contentList && item.contentList.length > 0;
  const contentListFontSize = Math.max(Math.min(width / 12, height / 8, 10), 7);
  const maxContentItems = Math.floor((height - 50) / 14);

  // Shared value for press animation
  const pressed = useSharedValue(0);

  // Animated press feedback style
  const animatedPressStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pressed.value,
      [0, 1],
      [1, 0.95],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  const handlePressIn = useCallback(() => {
    pressed.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) onPress(item);
  }, [onPress, item]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) onLongPress(item);
  }, [onLongPress, item]);

  // Position style
  const positionStyle = {
    position: 'absolute',
    left: item.x0,
    top: item.y0,
    width,
    height,
    backgroundColor: item.color,
  };

  // Track 5 glow effect
  const track5Style = isTrackFive ? {
    boxShadow: '0 0 12px rgba(251, 191, 36, 0.8)',
  } : {};

  // Vault track dashed border
  const vaultStyle = isVault ? {
    borderStyle: 'dashed',
    borderWidth: 2,
  } : {};

  // CSS-based entrance animation
  const entranceStyle = {
    animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.tileWrapper, positionStyle, entranceStyle]}
    >
      <Animated.View style={[styles.tileInner, animatedPressStyle]}>
        <View style={[styles.tile, track5Style, vaultStyle]}>
          {/* Order badge */}
          {showOrderNumber && (
            <View style={[styles.tileOrder, { backgroundColor: getOverlayColor(textColor) }]}>
              <Text style={[styles.tileOrderText, { color: textColor, fontSize: orderFontSize }]}>
                {index + 1}
              </Text>
            </View>
          )}

          {/* Album/Song name */}
          <Text
            style={[styles.tileName, { color: textColor, fontSize: nameFontSize }]}
            numberOfLines={2}
          >
            {item.name}
          </Text>

          {/* Metric value */}
          {showValue && !hasContentList && (
            <Text style={[styles.tileValue, { color: textColor, fontSize: valueFontSize }]}>
              {item.metricValue?.toLocaleString()}{suffix}
            </Text>
          )}

          {/* Content list */}
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
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default memo(AnimatedTile, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.x0 === next.item.x0 &&
    prev.item.y0 === next.item.y0 &&
    prev.item.x1 === next.item.x1 &&
    prev.item.y1 === next.item.y1 &&
    prev.item.metricValue === next.item.metricValue &&
    prev.metric?.key === next.metric?.key &&
    prev.index === next.index &&
    prev.showOrder === next.showOrder &&
    prev.isSmall === next.isSmall
  );
});

const styles = StyleSheet.create({
  tileWrapper: {
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'transform 0.15s ease-out',
  },
  tileInner: {
    flex: 1,
    borderRadius: 8,
  },
  tile: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1.5,
    borderColor: colors.border.tile,
    borderRadius: 8,
    backgroundColor: 'transparent',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
});
