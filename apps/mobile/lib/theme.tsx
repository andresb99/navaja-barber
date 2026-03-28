import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { navajaTheme, navajaUiModes, type NavajaUiModeTokens } from '@navaja/shared';

const THEME_STORAGE_KEY = '@navaja/theme-preference';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedThemeMode = 'light' | 'dark';

export type MobilePalette = NavajaUiModeTokens & {
  bg: string;
  mode: ResolvedThemeMode;
  primary: string;
  accent: string;
  accentForeground: string;
  success: string;
  warning: string;
  danger: string;
  focus: string;
  inverseSurface: string;
  inverseForeground: string;
  overlayBackdrop: string;
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
};

export type StatusTone = 'success' | 'warning' | 'danger';

function normalizeHex(value: string) {
  const trimmed = value.trim().replace('#', '');

  if (trimmed.length === 3) {
    return trimmed
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  return trimmed.slice(0, 6);
}

export function withOpacity(hex: string, opacity: number) {
  const normalized = normalizeHex(hex);
  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return hex;
  }

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function getStatusSurface(colors: MobilePalette, tone: StatusTone) {
  if (tone === 'success') {
    return {
      backgroundColor: withOpacity(colors.success, colors.mode === 'dark' ? 0.18 : 0.12),
      borderColor: withOpacity(colors.success, colors.mode === 'dark' ? 0.3 : 0.18),
      textColor: colors.mode === 'dark' ? '#99f6e4' : '#065f46',
    };
  }

  if (tone === 'warning') {
    return {
      backgroundColor: withOpacity(colors.warning, colors.mode === 'dark' ? 0.2 : 0.12),
      borderColor: withOpacity(colors.warning, colors.mode === 'dark' ? 0.32 : 0.18),
      textColor: colors.mode === 'dark' ? '#f8e2a4' : '#92400e',
    };
  }

  return {
    backgroundColor: withOpacity(colors.danger, colors.mode === 'dark' ? 0.2 : 0.12),
    borderColor: withOpacity(colors.danger, colors.mode === 'dark' ? 0.3 : 0.18),
    textColor: colors.mode === 'dark' ? '#fecaca' : '#991b1b',
  };
}

export function getMarketplaceCoverGradient(colors: MobilePalette, seed: string) {
  const palettes = [
    [withOpacity(colors.focus, 0.88), withOpacity(navajaTheme.hex.ink, 0.96)],
    [withOpacity(colors.accent, 0.9), withOpacity(navajaTheme.hex.ink, 0.96)],
    [withOpacity(colors.success, 0.86), withOpacity(navajaTheme.hex.ink, 0.96)],
    [withOpacity(colors.warning, 0.9), withOpacity('#172033', 0.96)],
  ] as const;
  const paletteIndex = seed.length % palettes.length;
  return palettes[paletteIndex] || palettes[0];
}

export function getMapPinColor(colors: MobilePalette, active: boolean) {
  if (active) {
    return colors.focus;
  }

  return colors.mode === 'dark' ? '#475569' : '#1f2937';
}

function resolveSystemMode(systemScheme: 'light' | 'dark' | null | undefined): ResolvedThemeMode {
  return systemScheme === 'dark' ? 'dark' : 'light';
}

function createPalette(mode: ResolvedThemeMode): MobilePalette {
  const base = navajaUiModes[mode];
  return {
    ...base,
    bg: base.background,
    mode,
    primary: mode === 'dark' ? '#f8fafc' : navajaTheme.hex.ink,
    accent: navajaTheme.hex.brass,
    accentForeground: navajaTheme.hex.ink,
    success: navajaTheme.hex.success,
    warning: navajaTheme.hex.warning,
    danger: navajaTheme.hex.danger,
    focus: mode === 'dark' ? navajaTheme.hex.focusDark : navajaTheme.hex.focusLight,
    inverseSurface: mode === 'dark' ? '#f8fafc' : navajaTheme.hex.ink,
    inverseForeground: mode === 'dark' ? navajaTheme.hex.ink : '#f8fafc',
    overlayBackdrop:
      mode === 'dark' ? 'rgba(4, 11, 21, 0.74)' : 'rgba(15, 23, 42, 0.18)',
    radiusSm: navajaTheme.radius.sm,
    radiusMd: navajaTheme.radius.md,
    radiusLg: navajaTheme.radius.lg,
  };
}

const initialResolvedMode = resolveSystemMode(Appearance.getColorScheme());
let mutablePalette = createPalette(initialResolvedMode);

export const palette = mutablePalette;

function syncLegacyPalette(mode: ResolvedThemeMode) {
  mutablePalette = createPalette(mode);
  Object.assign(palette, mutablePalette);
}

type ThemeContextValue = {
  preference: ThemePreference;
  mode: ResolvedThemeMode;
  colors: MobilePalette;
  isDark: boolean;
  isReady: boolean;
  setPreference: (next: ThemePreference) => Promise<void>;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  mode: initialResolvedMode,
  colors: palette,
  isDark: initialResolvedMode === 'dark',
  isReady: false,
  setPreference: async () => {},
  toggleTheme: async () => {},
});

export function NavajaThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((storedValue) => {
        if (!active) {
          return;
        }

        if (
          storedValue === 'light' ||
          storedValue === 'dark' ||
          storedValue === 'system'
        ) {
          setPreferenceState(storedValue);
        }
      })
      .finally(() => {
        if (active) {
          setIsReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const mode = useMemo<ResolvedThemeMode>(() => {
    if (preference === 'system') {
      return resolveSystemMode(systemScheme);
    }

    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(() => createPalette(mode), [mode]);

  useEffect(() => {
    syncLegacyPalette(mode);
  }, [mode]);

  async function setPreference(next: ThemePreference) {
    setPreferenceState(next);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }

  async function toggleTheme() {
    const next: ThemePreference = mode === 'dark' ? 'light' : 'dark';
    await setPreference(next);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      mode,
      colors,
      isDark: mode === 'dark',
      isReady,
      setPreference,
      toggleTheme,
    }),
    [colors, isReady, mode, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useNavajaTheme() {
  return useContext(ThemeContext);
}
