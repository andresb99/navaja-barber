export const navajaTheme = {
  rgb: {
    ink: '17 31 51',
    cream: '245 239 223',
    brass: '234 176 72',
    slate: '75 93 116',
    surface: '255 253 248',
    surfaceMuted: '239 228 205',
    focusLight: '139 92 246',
    focusDark: '234 176 72',
  },
  hex: {
    ink: '#111f33',
    cream: '#f5efdf',
    brass: '#eab048',
    slate: '#4b5d74',
    surface: '#fffdf8',
    surfaceMuted: '#efe4cd',
    focusLight: '#8b5cf6',
    focusDark: '#eab048',
    success: '#0f766e',
    warning: '#b45309',
    danger: '#991b1b',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
  },
} as const;

export type NavajaTheme = typeof navajaTheme;
