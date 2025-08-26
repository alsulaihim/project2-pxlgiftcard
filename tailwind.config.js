/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vercel's exact color system
        background: '#000000',
        foreground: '#FFFFFF',
        
        // Vercel gray scale
        'gray-50': '#FAFAFA',
        'gray-100': '#F5F5F5',
        'gray-200': '#E5E5E5',
        'gray-300': '#D4D4D4',
        'gray-400': '#A3A3A3',
        'gray-500': '#737373',
        'gray-600': '#525252',
        'gray-700': '#404040',
        'gray-800': '#262626',
        'gray-900': '#171717',
        'gray-950': '#0A0A0A',

        // Vercel accent colors
        blue: {
          500: '#0070F3',
          600: '#0761D1',
        },
        
        // Vercel semantic colors
        success: '#00D72F',
        error: '#E00000',
        warning: '#F59E0B',
        
        // Tier-specific colors (keeping PXL branding)
        tier: {
          starter: '#737373',
          rising: '#0070F3',
          pro: '#00D72F',
          pixlbeast: '#F59E0B',
          pixlionaire: '#E879F9',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        // Vercel's typography scale
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '1' }],
        '6xl': ['60px', { lineHeight: '1' }],
        '7xl': ['72px', { lineHeight: '1' }],
        '8xl': ['96px', { lineHeight: '1' }],
        '9xl': ['128px', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};
