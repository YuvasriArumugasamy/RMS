// Utility for handling order types, colors, icons, and badges across the application

export const ORDER_TYPE_CONFIG = {
  'Dine-in (QR)': {
    label: 'Dine-in (QR)',
    shortLabel: 'Dine-in (QR)',
    icon: '📱',
    color: '#6366f1', // Indigo
    bgRgba: 'rgba(99, 102, 241, 0.9)',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    lightBadgeBg: 'bg-indigo-50/70 text-indigo-650',
    textColor: 'text-indigo-600',
  },
  'Dine-in': {
    label: 'Dine-in',
    shortLabel: 'Dine-in',
    icon: '🍽️',
    color: '#f97316', // Orange
    bgRgba: 'rgba(249, 115, 22, 0.9)',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-100',
    lightBadgeBg: 'bg-orange-50/70 text-orange-650',
    textColor: 'text-orange-600',
  },
  'Takeaway': {
    label: 'Takeaway',
    shortLabel: 'Takeaway',
    icon: '🥡',
    color: '#10b981', // Emerald Green
    bgRgba: 'rgba(16, 185, 129, 0.9)',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    lightBadgeBg: 'bg-emerald-50/70 text-emerald-650',
    textColor: 'text-emerald-600',
  },
  'Takeaway (QR)': {
    label: 'Takeaway (QR)',
    shortLabel: 'Takeaway (QR)',
    icon: '📱',
    color: '#06b6d4', // Cyan
    bgRgba: 'rgba(6, 182, 212, 0.9)',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-100',
    lightBadgeBg: 'bg-cyan-50/70 text-cyan-650',
    textColor: 'text-cyan-600',
  },
  'Merged Bill': {
    label: 'Merged Bill',
    shortLabel: 'Merged',
    icon: '📑',
    color: '#8b5cf6', // Purple
    bgRgba: 'rgba(139, 92, 246, 0.9)',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-100',
    lightBadgeBg: 'bg-purple-50/70 text-purple-650',
    textColor: 'text-purple-600',
  },
};

const DEFAULT_CONFIG = {
  label: 'Other',
  shortLabel: 'Other',
  icon: '📋',
  color: '#3b82f6', // Blue
  bgRgba: 'rgba(59, 130, 246, 0.9)',
  badgeBg: 'bg-blue-50 text-blue-700 border-blue-100',
  lightBadgeBg: 'bg-blue-50/70 text-blue-650',
  textColor: 'text-blue-600',
};

/**
 * Get configuration for an order type
 */
export const getOrderTypeConfig = (type) => {
  if (!type) return ORDER_TYPE_CONFIG['Dine-in'];
  // Exact match
  if (ORDER_TYPE_CONFIG[type]) return ORDER_TYPE_CONFIG[type];
  
  // Case-insensitive / partial checks
  const lower = type.toLowerCase();
  if (lower.includes('qr') && lower.includes('dine')) return ORDER_TYPE_CONFIG['Dine-in (QR)'];
  if (lower.includes('qr') && lower.includes('takeaway')) return ORDER_TYPE_CONFIG['Takeaway (QR)'];
  if (lower.includes('dine')) return ORDER_TYPE_CONFIG['Dine-in'];
  if (lower.includes('takeaway') || lower.includes('parcel')) return ORDER_TYPE_CONFIG['Takeaway'];
  if (lower.includes('merge')) return ORDER_TYPE_CONFIG['Merged Bill'];
  
  return DEFAULT_CONFIG;
};

/**
 * Helper to check if an order type is Dine-in (either POS or QR)
 */
export const isDineIn = (type) => {
  if (!type) return true;
  const lower = type.toLowerCase();
  return lower.includes('dine');
};

/**
 * Helper to check if an order is a QR order
 */
export const isQROrder = (type) => {
  if (!type) return false;
  return type.toLowerCase().includes('qr');
};

/**
 * Get array of colors for chart labels
 */
export const getChartColorsForLabels = (labels = []) => {
  return labels.map(label => getOrderTypeConfig(label).bgRgba);
};
