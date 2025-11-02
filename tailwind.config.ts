import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        notion: {
          dark: {
            bg: '#25272B', // Main content background - lighter gray
            sidebar: '#2F3437', // Sidebar background - darker gray
            code: '#2F3437', // Same as sidebar for consistency
            text: '#FFFFFF', // Pure white for headings
            textSoft: '#E6E6E6', // Soft white for body text (~90% opacity)
            textMuted: '#9B9A97', // Notion's exact warm gray for secondary text (was cool gray #9B9B9B)
            border: '#3F3F3F', // Subtle gray borders for separators and containers
          },
          light: {
            bg: '#FFFFFF',
            sidebar: '#F7F6F3',
            code: '#F7F6F3',
            text: '#37352F',
            textMuted: '#787774',
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
