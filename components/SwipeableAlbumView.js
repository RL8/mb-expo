import { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { colors } from '../lib/theme';

/**
 * SwipeableAlbumView - Horizontal swipeable album carousel
 *
 * Web-compatible implementation using pointer events and CSS transforms.
 * Supports: touch/mouse drag, momentum, snap to album, arrow navigation
 */
export default function SwipeableAlbumView({
  albums,
  currentIndex,
  onIndexChange,
  renderAlbum,
  showArrows = true,
  showDots = true,
}) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastTime = useRef(0);

  // Sync offset with currentIndex
  useEffect(() => {
    if (!isDragging) {
      setOffset(-currentIndex * 100);
    }
  }, [currentIndex, isDragging]);

  const handlePointerDown = useCallback((e) => {
    setIsDragging(true);
    startX.current = e.clientX;
    startOffset.current = offset;
    lastX.current = e.clientX;
    lastTime.current = Date.now();
    velocity.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [offset]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return;

    const containerWidth = containerRef.current?.offsetWidth || 1;
    const dx = e.clientX - startX.current;
    const percentDx = (dx / containerWidth) * 100;

    // Calculate velocity for momentum
    const now = Date.now();
    const dt = now - lastTime.current;
    if (dt > 0) {
      velocity.current = (e.clientX - lastX.current) / dt;
    }
    lastX.current = e.clientX;
    lastTime.current = now;

    // Apply drag with resistance at edges
    let newOffset = startOffset.current + percentDx;
    const minOffset = -(albums.length - 1) * 100;
    const maxOffset = 0;

    if (newOffset > maxOffset) {
      newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
    } else if (newOffset < minOffset) {
      newOffset = minOffset + (newOffset - minOffset) * 0.3;
    }

    setOffset(newOffset);
  }, [isDragging, albums.length]);

  const handlePointerUp = useCallback((e) => {
    if (!isDragging) return;

    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    const containerWidth = containerRef.current?.offsetWidth || 1;

    // Determine target index based on position and velocity
    let targetIndex = currentIndex;

    // Velocity-based navigation (swipe)
    if (Math.abs(velocity.current) > 0.3) {
      if (velocity.current > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else if (velocity.current < 0 && currentIndex < albums.length - 1) {
        targetIndex = currentIndex + 1;
      }
    } else {
      // Position-based snap
      const currentOffset = offset;
      targetIndex = Math.round(-currentOffset / 100);
      targetIndex = Math.max(0, Math.min(albums.length - 1, targetIndex));
    }

    if (targetIndex !== currentIndex) {
      onIndexChange?.(targetIndex);
    } else {
      // Snap back to current
      setOffset(-currentIndex * 100);
    }
  }, [isDragging, currentIndex, offset, albums.length, onIndexChange]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange?.(currentIndex - 1);
    }
  }, [currentIndex, onIndexChange]);

  const goToNext = useCallback(() => {
    if (currentIndex < albums.length - 1) {
      onIndexChange?.(currentIndex + 1);
    }
  }, [currentIndex, albums.length, onIndexChange]);

  const goToIndex = useCallback((index) => {
    onIndexChange?.(index);
  }, [onIndexChange]);

  const trackStyle = {
    transform: `translateX(${offset}%)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
  };

  return (
    <View style={styles.container}>
      {/* Main carousel */}
      <View
        ref={containerRef}
        style={styles.viewport}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <View style={[styles.track, trackStyle]}>
          {albums.map((album, index) => (
            <View key={album.id || index} style={styles.slide}>
              {renderAlbum(album, index, index === currentIndex)}
            </View>
          ))}
        </View>
      </View>

      {/* Arrow navigation */}
      {showArrows && albums.length > 1 && (
        <>
          <Pressable
            style={[styles.arrow, styles.arrowLeft, currentIndex === 0 && styles.arrowDisabled]}
            onPress={goToPrev}
            disabled={currentIndex === 0}
          >
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable
            style={[styles.arrow, styles.arrowRight, currentIndex === albums.length - 1 && styles.arrowDisabled]}
            onPress={goToNext}
            disabled={currentIndex === albums.length - 1}
          >
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </>
      )}

      {/* Dot indicators */}
      {showDots && albums.length > 1 && (
        <View style={styles.dots}>
          {albums.map((_, index) => (
            <Pressable
              key={index}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
              onPress={() => goToIndex(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  viewport: {
    overflow: 'hidden',
    touchAction: 'pan-y', // Allow vertical scroll, capture horizontal
    cursor: 'grab',
    userSelect: 'none',
  },
  track: {
    flexDirection: 'row',
    width: '100%',
  },
  slide: {
    width: '100%',
    flexShrink: 0,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'opacity 0.2s, transform 0.2s',
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  arrowDisabled: {
    opacity: 0.3,
    cursor: 'default',
  },
  arrowText: {
    fontSize: 28,
    color: colors.text.primary,
    fontFamily: 'Outfit_300Light',
    marginTop: -4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface.light,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.2s',
  },
  dotActive: {
    backgroundColor: colors.accent.primary,
    transform: [{ scale: 1.2 }],
  },
});
