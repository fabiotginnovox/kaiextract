/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kai: {
          bg: '#2E2621',
          accent: '#D5A474',
          'accent-text': '#2D251B',
          title: '#FFFEFD',
          body: '#999592',
          tag: '#BCB4AD',
          support: '#97918D',
          surface: '#58493D',
          border: '#453A31',
          line: '#48403A',
          emerald: '#169467',
          olive: '#A8B047',
        }
      },
      fontFamily: {
        serif: ['Lora', 'serif'],
        sans: ['Geist', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}

