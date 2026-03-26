import type { Config } from 'tailwindcss';
import { heroui } from '@heroui/react';
import plugin from 'tailwindcss/plugin';

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
  			ink: 'rgb(var(--ink) / <alpha-value>)',
  			cream: 'rgb(var(--cream) / <alpha-value>)',
  			brass: 'rgb(var(--brass) / <alpha-value>)',
  			slate: 'rgb(var(--slate) / <alpha-value>)',
  			focusLight: 'rgb(var(--focus-light) / <alpha-value>)',
  			focusDark: 'rgb(var(--focus-dark) / <alpha-value>)',
  			'page-bg': 'rgb(var(--page-bg) / <alpha-value>)',
  			'surface-sheet': 'rgb(var(--surface-sheet) / <alpha-value>)',
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
  		}
  	}
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
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
    // Glass navbar utilities — declared after heroui() so source order wins without !important
    plugin(function ({ addComponents }) {
      addComponents({
        '.glass-navbar-wrapper': {
          background:
            'linear-gradient(135deg, rgb(255 255 255 / 0.82), rgb(250 248 245 / 0.76)), var(--brand-panel-aura-soft)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        },
        '.dark .glass-navbar-wrapper': {
          background: 'rgba(9, 9, 11, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        },
        '.glass-navbar-menu': {
          background:
            'linear-gradient(155deg, rgb(255 255 255 / 0.94), rgb(250 248 245 / 0.88)), var(--brand-panel-aura-strong)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        },
        '.dark .glass-navbar-menu': {
          background: 'rgba(9, 9, 11, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        },
      });
    }),
  ],
};

export default config;

