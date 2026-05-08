import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:     '#1565C0',
          blueDark: '#0D47A1',
          blueLight:'#42A5F5',
          surf:     '#E3F0FF',
          bg:       '#F5F7FB',
          card:     '#FFFFFF',
          border:   '#DDE3EE',
          text:     '#1A2340',
          sub:      '#6B7A99',
          success:  '#1B8B5A',
          warn:     '#E65100',
          error:    '#D32F2F',
          gold:     '#F9A825',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(0,0,0,0.06)',
        glow: '0 0 28px 4px rgba(66,165,245,0.45)',
      },
    },
  },
  plugins: [],
}
export default config
