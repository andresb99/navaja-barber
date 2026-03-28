import { useNavajaTheme } from '../../lib/theme';

export type ThemeColors = ReturnType<typeof useNavajaTheme>['colors'];

export function getSurfaceGradient(colors: ThemeColors) {
  return [colors.surfaceGradientStart, colors.surfaceGradientEnd] as const;
}

export function getHeroGradient(colors: ThemeColors) {
  return [colors.heroGradientStart, colors.heroGradientEnd] as const;
}

export function getSecondaryGradient(colors: ThemeColors) {
  if (colors.mode === 'dark') {
    return ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] as const;
  }
  return [colors.secondaryGradientStart, colors.secondaryGradientEnd] as const;
}

export function getActiveGradient(colors: ThemeColors) {
  return [colors.activeGradientStart, colors.activeGradientEnd] as const;
}

export function getPrimaryGradient(colors: ThemeColors) {
  return [colors.primaryGradientStart, colors.primaryGradientEnd] as const;
}

export function getGlassTint(colors: ThemeColors) {
  return colors.mode === 'dark'
    ? (['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'] as const)
    : (['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)'] as const);
}

export function getSheenGradient(
  colors: ThemeColors,
  intensity: 'soft' | 'strong' = 'soft',
) {
  if (colors.mode === 'dark') {
    return intensity === 'strong'
      ? (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)'] as const)
      : (['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)', 'rgba(255,255,255,0)'] as const);
  }

  return intensity === 'strong'
    ? (['rgba(255,255,255,0.26)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'] as const)
    : (['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0)'] as const);
}

export function getCoolFade(colors: ThemeColors) {
  return colors.mode === 'dark'
    ? (['rgba(139,92,246,0.12)', 'rgba(139,92,246,0.04)', 'rgba(139,92,246,0)'] as const)
    : (['rgba(139,92,246,0.10)', 'rgba(139,92,246,0.03)', 'rgba(139,92,246,0)'] as const);
}

export function getWarmFade(colors: ThemeColors) {
  return colors.mode === 'dark'
    ? (['rgba(63,63,70,0.22)', 'rgba(63,63,70,0.07)', 'rgba(63,63,70,0)'] as const)
    : (['rgba(217,70,239,0.07)', 'rgba(217,70,239,0.02)', 'rgba(217,70,239,0)'] as const);
}
