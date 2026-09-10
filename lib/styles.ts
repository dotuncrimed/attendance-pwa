// @ts-nocheck
/**
 * Modern Design System - Shared Styles
 * Professional, clean, inline-style tokens for the attendance PWA
 */

export const colors = {
  // Primary
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  primaryLight: '#eff6ff',
  
  // Neutral backgrounds
  bgPrimary: '#f8fafc',
  bgSecondary: '#ffffff',
  bgTertiary: '#f1f5f9',
  
  // Text colors
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  
  // Status colors
  success: '#16a34a',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  
  warning: '#ca8a04',
  warningBg: '#fefce8',
  warningBorder: '#fef08a',
  
  info: '#0284c7',
  infoBg: '#f0f9ff',
  infoBorder: '#bae6fd',
  
  // Borders
  borderLight: '#e2e8f0',
  borderMedium: '#cbd5e1',
  
  // Shadows
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const borderRadius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  '2xl': 12,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 14,
  lg: 15,
  xl: 16,
  '2xl': 18,
  '3xl': 20,
  '4xl': 24,
};

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  heading: {
    h1: { fontSize: 24, fontWeight: 700, color: colors.textPrimary, margin: "0 0 8px 0" },
    h2: { fontSize: 20, fontWeight: 600, color: colors.textPrimary, margin: "0 0 8px 0" },
    h3: { fontSize: 18, fontWeight: 600, color: colors.textPrimary, margin: "0 0 8px 0" },
  },
  body: {
    base: { fontSize: 14, fontWeight: 400, color: colors.textSecondary, lineHeight: 1.5 },
    muted: { fontSize: 13, fontWeight: 400, color: colors.textMuted },
  },
};

export const commonStyles = {
  card: {
    background: colors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing['3xl'],
    boxShadow: colors.shadowMd,
    border: `1px solid ${colors.borderLight}`,
  },
  
  input: {
    width: "100%",
    padding: `${spacing.md} ${spacing.lg}`,
    border: `1px solid ${colors.borderMedium}`,
    borderRadius: borderRadius.lg,
    fontSize: fontSize.base,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    color: colors.textPrimary,
    backgroundColor: colors.bgSecondary,
  },
  
  inputFocus: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primaryLight}`,
  },
  
  primaryButton: {
    padding: `${spacing.md} ${spacing.xl}`,
    background: colors.primary,
    color: "#ffffff",
    border: "none",
    borderRadius: borderRadius.lg,
    cursor: "pointer",
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
    transition: "background 0.2s, transform 0.1s",
  },
  
  secondaryButton: {
    padding: `${spacing.sm} ${spacing.lg}`,
    background: colors.bgTertiary,
    color: colors.textSecondary,
    border: `1px solid ${colors.borderLight}`,
    borderRadius: borderRadius.lg,
    cursor: "pointer",
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    transition: "background 0.2s",
  },
  
  dangerButton: {
    padding: `${spacing.sm} ${spacing.lg}`,
    background: colors.danger,
    color: "#ffffff",
    border: "none",
    borderRadius: borderRadius.lg,
    cursor: "pointer",
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: borderRadius.full,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  
  badgeSuccess: {
    background: colors.successBg,
    color: colors.success,
    border: `1px solid ${colors.successBorder}`,
  },
  
  badgeDanger: {
    background: colors.dangerBg,
    color: colors.danger,
    border: `1px solid ${colors.dangerBorder}`,
  },
  
  badgeWarning: {
    background: colors.warningBg,
    color: colors.warning,
    border: `1px solid ${colors.warningBorder}`,
  },
  
  badgeInfo: {
    background: colors.infoBg,
    color: colors.info,
    border: `1px solid ${colors.infoBorder}`,
  },
};
