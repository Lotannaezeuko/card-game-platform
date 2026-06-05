/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surface2: 'var(--color-surface-2)',
        surface3: 'var(--color-surface-3)',
        accent: 'var(--color-accent)',
        accentHover: 'var(--color-accent-hover)',
        accentMuted: 'var(--color-accent-muted)',
        text: 'var(--color-text)',
        textMuted: 'var(--color-text-muted)',
        textFaint: 'var(--color-text-faint)',
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        border: 'var(--color-border)',
        borderAccent: 'var(--color-border-accent)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}
