import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    {
      pattern: /(text|bg|border|shadow|ring)-(emerald|cyan|pink|indigo|blue|orange|rose|sky|red|purple|green|amber|slate)-(400|500|600|800)(\/(10|20|30|50))?/,
      variants: ['hover', 'focus', 'group-hover', 'dark'],
    },
    {
      pattern: /from-(emerald|cyan|pink|indigo|blue|orange|rose|sky|red|purple|green|amber|slate)-(600|800)/,
    },
    {
      pattern: /to-(emerald|cyan|pink|indigo|blue|orange|rose|sky|red|purple|green|amber|slate)-(600|800)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#6366F1',
          secondary: '#10B981',
          accent: '#F43F5E',
          gold: '#F59E0B',
          dark: '#0F172A',
          surface: '#1E293B'
        }
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pop-in': 'popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        }
      }
    },
  },
  plugins: [],
};
export default config;
