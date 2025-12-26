import { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { colors, getContrastColor, getOverlayColor } from '../lib/theme';

// Original implementation using React Native's Animated API (JS thread)
export default function LegacyAnimatedTile({
  item,
  metric,
  suffix,
  isSmall,
  index,
  showOrder,
  onPress,
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
          {item.metricValue?.toLocaleString()}{suffix}
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

  // Track 5 glow effect
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

const styles = StyleSheet.create({
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
});
