import type { Config } from 'tailwindcss';

/**
 * Naseej Textile Recovery Platform — design system (modern, light).
 *
 *   Primary:  ink indigo     #1F2A44  (authority, depth)
 *   Accent:   weave violet   #6B4EFF  (recognition, certification — used sparingly)
 *   Success:  recovery green #2E9E7E
 *   Canvas:   warm linen     #F5F2EC  with white surfaces
 *
 * Semantic token names (brand/ink/cream/mist/muted/line) are kept identical
 * to the inherited codebase so every component repaints without edits.
 * Legacy aliases (forest/amber/terra/lime) map onto the new ramps.
 */

const brandRamp = {
  DEFAULT: '#1F2A44',
  50:  '#EEF0F6',
  100: '#D7DBE8',
  200: '#AEB6D0',
  300: '#8491B6',
  400: '#5C6C9A',
  500: '#3E4D7A',
  600: '#2C3A5E',
  700: '#1F2A44',
  800: '#141C30',
  900: '#0B101D',
};

const goldRamp = {
  DEFAULT: '#6B4EFF',
  50:  '#F1EEFF',
  100: '#E0DAFF',
  200: '#C4B8FF',
  300: '#A596FF',
  400: '#8873FF',
  500: '#6B4EFF',
  600: '#553BD6',
  700: '#412CA8',
  800: '#2C1E75',
  900: '#191142',
};

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── Primary brand: ink indigo ─────────────────────────
        brand: brandRamp,

        // ── Violet accent (certification / recognition moments) — token name kept as `gold` ──
        gold: goldRamp,

        // ── Success: recovery green ───────────────────────────
        mint: {
          DEFAULT: '#2E9E7E',
          100: '#DDF2EB',
          300: '#8ED4BE',
          500: '#2E9E7E',
          700: '#1E6B55',
        },

        // ── Neutral ramp — warm linen ─────────────────────────
        ink:   '#121829',
        cream: '#FAF8F4',  // raised warm surface
        mist:  '#F5F2EC',  // body canvas
        muted: '#6B7280',  // secondary text
        line:  '#E5E1D8',  // borders

        // ── Legacy aliases (existing component refs repaint in-brand) ──
        forest: brandRamp,
        amber: goldRamp,
        terra: goldRamp,
        lime: goldRamp,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'IBM Plex Sans Arabic', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Amiri', 'serif'],
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 42, 68, 0.04), 0 2px 8px rgba(31, 42, 68, 0.05)',
        'card-hover': '0 6px 18px rgba(31, 42, 68, 0.10)',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
