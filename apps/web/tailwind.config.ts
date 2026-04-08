import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/src/**/*.{ts,tsx}',
  ],
  theme: {
  	extend: {
  		colors: {
        elite: {
          primary: '#bf9cff',
          dim: '#af8cef',
          surface: '#0e0e0e',
          high: '#201f1f',
          muted: '#adaaaa',
          on: '#e5e2e1',
        },
  			ink: 'rgb(var(--ink) / <alpha-value>)',
  			cream: 'rgb(var(--cream) / <alpha-value>)',
  			brass: 'rgb(var(--brass) / <alpha-value>)',
  			slate: 'rgb(var(--slate) / <alpha-value>)',
  			focusLight: 'rgb(var(--focus-light) / <alpha-value>)',
  			focusDark: 'rgb(var(--focus-dark) / <alpha-value>)',
  			'page-bg': 'rgb(var(--page-bg) / <alpha-value>)',
  			'surface-sheet': 'rgb(var(--surface-sheet) / <alpha-value>)',
  			/* ── Tenant Atelier tokens ── */
  			'at-page': 'rgb(var(--at-page) / <alpha-value>)',
  			'at-deep': 'rgb(var(--at-deep) / <alpha-value>)',
  			'at-surface': 'rgb(var(--at-surface) / <alpha-value>)',
  			'at-raised': 'rgb(var(--at-raised) / <alpha-value>)',
  			'at-elevated': 'rgb(var(--at-elevated) / <alpha-value>)',
  			'at-accent-bg': 'rgb(var(--at-accent-bg) / <alpha-value>)',
  			'at-accent-bg-h': 'rgb(var(--at-accent-bg-h) / <alpha-value>)',
  			'at-modal': 'rgb(var(--at-modal) / <alpha-value>)',
  			'at-heading': 'rgb(var(--at-heading) / <alpha-value>)',
  			'at-body': 'rgb(var(--at-body) / <alpha-value>)',
  			'at-muted': 'rgb(var(--at-muted) / <alpha-value>)',
  			'at-faint': 'rgb(var(--at-faint) / <alpha-value>)',
  			'at-ghost': 'rgb(var(--at-ghost) / <alpha-value>)',
  			'at-accent': 'rgb(var(--at-accent) / <alpha-value>)',
  			'at-accent-light': 'rgb(var(--at-accent-light) / <alpha-value>)',
  			'at-accent-mid': 'rgb(var(--at-accent-mid) / <alpha-value>)',
  			'at-accent-hover': 'rgb(var(--at-accent-hover) / <alpha-value>)',
  			'at-accent-on': 'rgb(var(--at-accent-on) / <alpha-value>)',
  			'at-border': 'rgb(var(--at-border) / <alpha-value>)',
  			'at-divider': 'rgb(var(--at-divider) / <alpha-value>)',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			halo: '0 0 0 1px rgba(255,255,255,0.14), 0 30px 60px -28px rgba(0,0,0,0.8)'
  		},
  		keyframes: {
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0px)'
  				},
  				'50%': {
  					transform: 'translateY(-10px)'
  				}
  			}
  		},
  		animation: {
  			float: 'float 7s ease-in-out infinite'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		screens: {
  			xs: '480px',
  		},
      fontFamily: {
        elite: ['var(--font-body)', 'sans-serif'],
      }
  	}
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            background: '#f7f5f3',
            foreground: '#11111b',
            content1: '#ffffff',
            content2: '#f4f4f5',
            content3: '#e4e4e7',
            content4: '#d4d4d8',
            default: {
              50: '#fafafa',
              100: '#f4f4f5',
              200: '#e4e4e7',
              300: '#d4d4d8',
              400: '#a1a1aa',
              500: '#71717a',
              600: '#52525b',
              700: '#3f3f46',
              800: '#27272a',
              900: '#18181b',
              DEFAULT: '#e4e4e7',
              foreground: '#11111b',
            },
            primary: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              300: '#c4b5fd',
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
              800: '#5b21b6',
              900: '#4c1d95',
              DEFAULT: '#8b5cf6',
              foreground: '#ffffff',
            },
            focus: '#8b5cf6',
          },
        },
        dark: {
          colors: {
            background: '#09090b',
            foreground: '#fafafa',
            content1: '#18181b',
            content2: '#27272a',
            content3: '#3f3f46',
            content4: '#52525b',
            default: {
              50: '#18181b',
              100: '#27272a',
              200: '#3f3f46',
              300: '#52525b',
              400: '#71717a',
              500: '#a1a1aa',
              600: '#d4d4d8',
              700: '#e4e4e7',
              800: '#f4f4f5',
              900: '#fafafa',
              DEFAULT: '#3f3f46',
              foreground: '#fafafa',
            },
            primary: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              300: '#c4b5fd',
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
              800: '#5b21b6',
              900: '#4c1d95',
              DEFAULT: '#a78bfa',
              foreground: '#ffffff',
            },
            focus: '#a78bfa',
          },
        },
      },
    }),
  ],
};

export default config;

