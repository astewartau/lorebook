/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lorcana': {
          'gold': '#d3ba84',
          'navy': '#26223d',
          'purple': '#3d3659',
          'purple-light': '#4d4266',
          'cream': '#f9f6f0',
          'ink': '#1a1a1a',
        }
      },
      boxShadow: {
        'art-deco': '0 0 0 1px #d3ba84, 0 0 0 3px #26223d',
        'art-deco-hover': '0 0 0 2px #d3ba84, 0 0 0 4px #26223d',
      },
      backgroundImage: {
        'art-deco-corner': `
          linear-gradient(to right, #d3ba84 2px, transparent 2px),
          linear-gradient(to bottom, #d3ba84 2px, transparent 2px),
          linear-gradient(to left, #d3ba84 2px, transparent 2px),
          linear-gradient(to top, #d3ba84 2px, transparent 2px)
        `,
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

