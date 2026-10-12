/**
 * Soft neutral canvas + white surfaces — easy on the eyes, no cream/blue cast.
 */
export const colors = {
  background: '#F8F8F8',
  paper: '#FFFFFF',
  tile: '#A8A8A8',
  tilePressed: '#949494',
  mutedFill: '#F0F0F0',
  surface: '#FFFFFF',
  text: '#2C2C2C',
  textOnTile: '#FFFFFF',
  textSecondary: '#666666',
  textMuted: '#ADADAD',
  border: '#EFEFEF',
  primary: '#A8A8A8',
  onPrimary: '#FFFFFF',
  price: '#2C2C2C',
  danger: '#E53935',
  overlay: 'rgba(0, 0, 0, 0.4)',
  tabActive: '#2C2C2C',
  tabInactive: '#B0B0B0',
  chipActiveBg: '#A8A8A8',
  chipActiveText: '#FFFFFF',
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.025,
    shadowRadius: 4,
    elevation: 0,
  },
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  tile: 14,
  pill: 999,
} as const;
