import { useState, useRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';

/**
 * InteractiveTreemap - Zoomable/pannable treemap container
 *
 * Web-compatible implementation using pointer events and CSS transforms.
 * Supports: wheel zoom, drag pan, double-click zoom, touch pinch/pan
 */
export default function InteractiveTreemap({
  children,
  width,
  height,
  minScale = 0.5,
  maxScale = 3,
  onZoomChange,
}) {
  // Transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Interaction refs
  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastPinchDistance = useRef(null);

  // Clamp scale to bounds
  const clampScale = useCallback((s) => {
    return Math.max(minScale, Math.min(maxScale, s));
  }, [minScale, maxScale]);

  // Clamp translation to keep content visible
  const clampTranslate = useCallback((x, y, currentScale) => {
    const maxX = (width * (currentScale - 1)) / 2;
    const maxY = (height * (currentScale - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [width, height]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();

    const delta = e.deltaY * -0.002;
    const newScale = clampScale(scale + delta);

    if (newScale !== scale) {
      setScale(newScale);
      // Adjust translation to zoom toward cursor
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;
        const scaleDiff = newScale - scale;
        const newTranslate = clampTranslate(
          translate.x - cursorX * scaleDiff * 0.1,
          translate.y - cursorY * scaleDiff * 0.1,
          newScale
        );
        setTranslate(newTranslate);
      }
      onZoomChange?.(newScale);
    }
  }, [scale, translate, clampScale, clampTranslate, onZoomChange]);

  // Handle pointer down (start drag)
  const handlePointerDown = useCallback((e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) return; // Multi-touch handled separately

    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  // Handle pointer move (drag)
  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;

    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    const newTranslate = clampTranslate(
      translate.x + dx,
      translate.y + dy,
      scale
    );
    setTranslate(newTranslate);
  }, [translate, scale, clampTranslate]);

  // Handle pointer up (end drag)
  const handlePointerUp = useCallback((e) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  // Handle double-click to toggle zoom
  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();

    if (scale > 1.1) {
      // Zoom out to 1
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      onZoomChange?.(1);
    } else {
      // Zoom in to 2x centered on click
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left - rect.width / 2;
        const clickY = e.clientY - rect.top - rect.height / 2;
        const newScale = 2;
        const newTranslate = clampTranslate(-clickX * 0.5, -clickY * 0.5, newScale);
        setScale(newScale);
        setTranslate(newTranslate);
        onZoomChange?.(newScale);
      }
    }
  }, [scale, clampTranslate, onZoomChange]);

  // Handle touch pinch zoom
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();

      // Calculate pinch distance
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      if (lastPinchDistance.current !== null) {
        const delta = (distance - lastPinchDistance.current) * 0.01;
        const newScale = clampScale(scale + delta);

        if (newScale !== scale) {
          setScale(newScale);
          onZoomChange?.(newScale);
        }
      }

      lastPinchDistance.current = distance;
    }
  }, [scale, clampScale, onZoomChange]);

  const handleTouchEnd = useCallback(() => {
    lastPinchDistance.current = null;
  }, []);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    onZoomChange?.(1);
  }, [onZoomChange]);

  const transformStyle = {
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
    transformOrigin: 'center center',
    transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
  };

  return (
    <View
      ref={containerRef}
      style={[styles.container, { width, height }]}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <View style={[styles.content, transformStyle]}>
        {children}
      </View>

      {/* Zoom indicator */}
      {scale !== 1 && (
        <View style={styles.zoomIndicator}>
          <View style={styles.zoomBadge}>
            <span style={styles.zoomText}>{Math.round(scale * 100)}%</span>
          </View>
        </View>
      )}
    </View>
  );
}

// Export reset function for external control
InteractiveTreemap.useZoomReset = () => {
  const [key, setKey] = useState(0);
  return {
    key,
    reset: () => setKey(k => k + 1),
  };
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
    cursor: 'grab',
    touchAction: 'none', // Prevent browser handling of touch
    userSelect: 'none',
  },
  content: {
    width: '100%',
    height: '100%',
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    pointerEvents: 'none',
  },
  zoomBadge: {
    backgroundColor: colors.bg.overlay,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  zoomText: {
    color: colors.text.primary,
    fontSize: 11,
    fontFamily: 'JetBrainsMono_400Regular',
  },
});
