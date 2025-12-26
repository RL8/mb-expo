import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../lib/theme';

const AnimatedScrollView = Animated.ScrollView;

// Header that shrinks/collapses as user scrolls
const CollapsibleHeader = forwardRef(({
  title,
  subtitle,
  headerHeight = 100,
  minHeaderHeight = 50,
  scrollContent,
  headerContent,
  headerRight,
  stickyComponent,
  onScroll: externalOnScroll,
  style,
}, ref) => {
  const scrollY = useSharedValue(0);
  const collapseThreshold = headerHeight - minHeaderHeight;

  // Expose scroll value to parent
  useImperativeHandle(ref, () => ({
    scrollY,
    scrollTo: (y) => {
      // Would need scroll ref
    },
  }));

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      if (externalOnScroll) {
        externalOnScroll(event);
      }
    },
  });

  // Header container style - shrinks on scroll
  const headerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, collapseThreshold],
      [headerHeight, minHeaderHeight],
      Extrapolation.CLAMP
    );

    return {
      height,
    };
  });

  // Title style - fades and scales
  const titleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, collapseThreshold * 0.5],
      [1, 0],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [0, collapseThreshold],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, collapseThreshold],
      [0, -10],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  // Subtitle style - fades faster
  const subtitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, collapseThreshold * 0.3],
      [1, 0],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  // Compact title (shows when collapsed)
  const compactTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [collapseThreshold * 0.5, collapseThreshold],
      [0, 1],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  // Shadow on header when scrolled
  const headerShadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      scrollY.value,
      [0, 20],
      [0, 0.3],
      Extrapolation.CLAMP
    );

    return {
      shadowOpacity,
      elevation: scrollY.value > 0 ? 4 : 0,
    };
  });

  return (
    <View style={[styles.container, style]}>
      {/* Animated header */}
      <Animated.View style={[styles.header, headerStyle, headerShadowStyle]}>
        <View style={styles.headerInner}>
          {/* Full header content */}
          <Animated.View style={[styles.titleContainer, titleStyle]}>
            {headerContent || (
              <>
                <Text style={styles.title}>{title}</Text>
                {subtitle && (
                  <Animated.Text style={[styles.subtitle, subtitleStyle]}>
                    {subtitle}
                  </Animated.Text>
                )}
              </>
            )}
          </Animated.View>

          {/* Compact title (visible when collapsed) */}
          <Animated.View style={[styles.compactTitle, compactTitleStyle]}>
            <Text style={styles.compactTitleText} numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>

          {/* Right side content */}
          {headerRight && (
            <View style={styles.headerRight}>
              {headerRight}
            </View>
          )}
        </View>

        {/* Sticky component (e.g., filters, tabs) */}
        {stickyComponent && (
          <View style={styles.stickyContainer}>
            {stickyComponent}
          </View>
        )}
      </Animated.View>

      {/* Scrollable content */}
      <AnimatedScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight },
        ]}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {scrollContent}
      </AnimatedScrollView>
    </View>
  );
});

CollapsibleHeader.displayName = 'CollapsibleHeader';

export default CollapsibleHeader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.bg.primary,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: 'Outfit_800ExtraBold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.text.muted,
    marginTop: 2,
  },
  compactTitle: {
    position: 'absolute',
    left: 16,
    right: 60,
  },
  compactTitleText: {
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
