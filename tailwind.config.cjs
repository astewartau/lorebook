/** @type {import('tailwindcss').Config} */
const token = name => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        'surface-3': token('surface-3'),
        line: token('border'),
        fg: token('text'),
        muted: token('muted'),
        accent: token('accent'),
        'accent-fill': token('accent-fill'),
        'on-accent': token('on-accent'),
        danger: token('danger'),
        success: token('success'),
        ink: {
          amber: '#f4b223',
          amethyst: '#8b4aa8',
          emerald: '#2a8c55',
          ruby: '#d0263c',
          sapphire: '#1f87c8',
          steel: '#8e9aa6',
        },
        // Old palette, still used by pages not yet rebuilt.
        lorcana: {
          gold: '#d3ba84',
          navy: '#26223d',
          purple: '#3d3659',
          'purple-light': '#4d4266',
          cream: '#f9f6f0',
          ink: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.12), 0 4px 16px rgb(var(--shadow) / 0.10)',
        pop: '0 8px 32px rgb(var(--shadow) / 0.28)',
      },
      aspectRatio: {
        card: '367 / 512',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')({ strategy: 'class' })],
};
