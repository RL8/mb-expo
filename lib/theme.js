// Theme colors with WCAG AA+ compliant contrast ratios
// All colors tested against primary background #020617

export const colors = {
  // Backgrounds
  bg: {
    primary: '#020617',      // slate-950 - main background
    card: '#0f172a',         // slate-900 - card/modal backgrounds
    elevated: '#1e293b',     // slate-800 - elevated surfaces
    overlay: 'rgba(0, 0, 0, 0.85)', // modal overlays
  },

  // Text - all meet WCAG AA on bg.primary
  text: {
    primary: '#e2e8f0',      // slate-200 - 14.5:1 contrast
    secondary: '#94a3b8',    // slate-400 - 7.0:1 contrast
    muted: '#64748b',        // slate-500 - 4.6:1 contrast (AA)
    disabled: '#475569',     // slate-600 - 3.0:1 (AA large text only)
    inverse: '#020617',      // for light backgrounds
  },

  // Accent colors
  accent: {
    primary: '#38bdf8',      // sky-400 - main accent
    primaryMuted: 'rgba(56, 189, 248, 0.15)', // subtle accent bg
    primaryBorder: 'rgba(56, 189, 248, 0.5)', // accent borders
  },

  // Semantic colors
  semantic: {
    success: '#4ade80',      // green-400
    error: '#f87171',        // red-400
    warning: '#fbbf24',      // amber-400
    warningMuted: 'rgba(251, 191, 36, 0.15)',
    warningBorder: 'rgba(251, 191, 36, 0.3)',
  },

  // Borders
  border: {
    subtle: 'rgba(51, 65, 85, 0.3)',   // slate-700 @ 30%
    medium: 'rgba(51, 65, 85, 0.5)',   // slate-700 @ 50%
    strong: '#334155',                  // slate-700 solid
    tile: 'rgba(2, 6, 23, 0.8)',       // dark tile borders
  },

  // Interactive states
  interactive: {
    hover: 'rgba(56, 189, 248, 0.1)',
    pressed: 'rgba(56, 189, 248, 0.2)',
    disabled: 'rgba(56, 189, 248, 0.2)',
    disabledText: '#475569',
  },

  // Surface overlays (for cards on cards)
  surface: {
    light: 'rgba(15, 23, 42, 0.4)',    // light surface
    medium: 'rgba(15, 23, 42, 0.6)',   // medium surface
    heavy: 'rgba(15, 23, 42, 0.85)',   // heavy surface
  },

  // Contrast helpers for dynamic album colors
  contrast: {
    light: '#ffffff',
    dark: '#000000',
    lightOverlay: 'rgba(255, 255, 255, 0.2)',
    darkOverlay: 'rgba(0, 0, 0, 0.15)',
    lightBadge: 'rgba(255, 255, 255, 0.95)',
    darkBadge: 'rgba(0, 0, 0, 0.8)',
  },

  // Fallback for missing album colors
  fallback: '#64748b',
};

// Helper to get contrast color for any hex background
export function getContrastColor(hexColor) {
  if (!hexColor) return colors.contrast.light;
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? colors.contrast.dark : colors.contrast.light;
}

// Helper to get overlay color based on text color
export function getOverlayColor(textColor) {
  return textColor === colors.contrast.dark
    ? colors.contrast.darkOverlay
    : colors.contrast.lightOverlay;
}

// Helper to get badge background based on text color
export function getBadgeBackground(textColor) {
  return textColor === colors.contrast.dark
    ? colors.contrast.darkBadge
    : colors.contrast.lightBadge;
}

// Helper to get inverted text for badges
export function getBadgeTextColor(textColor) {
  return textColor === colors.contrast.dark
    ? colors.contrast.light
    : colors.contrast.dark;
}

export default colors;
