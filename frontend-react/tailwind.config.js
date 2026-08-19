/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],

  // Disable Preflight so it doesn't conflict with existing page styles during migration
  corePlugins: { preflight: false },

  theme: {
    extend: {
      colors: {
        // ── Backgrounds ──────────────────────────────────────────
        // Tailwind token → user token name → hex
        canvas:   '#0A0F0D', // bg-primary   — app background
        surface:  '#131A17', // bg-surface   — cards / panels
        elevated: '#1A2420', // bg-surface-elevated — modals
        // ── Accents ──────────────────────────────────────────────
        accent:   '#22C55E', // accent-green — primary actions
        glow:     '#4ADE80', // accent-green-glow — highlights
        // ── States ───────────────────────────────────────────────
        danger:   '#EF4444', // danger-red
        warn:     '#F59E0B', // warning-amber
        // ── Text & borders ───────────────────────────────────────
        light:    '#F5F5F5', // text-primary
        muted:    '#9CA3AF', // text-secondary
        edge:     '#2A332E', // border-subtle
      },

      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },

      // Named type scales matching the spec
      fontSize: {
        hero:    ['2rem',      { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        section: ['1.125rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '-0.01em' }],
        body:    ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['0.75rem',  { lineHeight: '1.4', fontWeight: '400' }],
      },

      boxShadow: {
        'glow-green': '0 0 24px rgba(34,197,94,0.30)',
        card:         '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(42,51,46,0.5)',
      },
    },
  },

  plugins: [],
}
