/** @type {import('tailwindcss').Config} */
// Colours and faces come from src/tokens.css so the design has one source.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        paper2: 'var(--color-paper-2)',
        paper3: 'var(--color-paper-3)',
        ink: 'var(--color-ink)',
        ink2: 'var(--color-ink-2)',
        muted: 'var(--color-muted)',
        rule: 'var(--color-rule)',
        accent: 'var(--color-accent)',
        teal: 'var(--color-teal)',
        amber: 'var(--color-amber)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        sans: 'var(--font-body)',
        mono: 'var(--font-outlier)',
      },
    },
  },
  plugins: [],
}
