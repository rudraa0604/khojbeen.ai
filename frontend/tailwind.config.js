/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'card-dark': '#13233A',
        'card-dark-hover': '#162A44',
        'bg-dark': '#0B1220',
        'bg-dark-subtle': '#0F1B2D',
        'border-dark': 'rgba(255, 255, 255, 0.08)',
        'border-dark-teal': 'rgba(16, 185, 129, 0.2)',
        brand: {
          primary: "#10B981",       // Emerald 500
          "primary-dark": "#0D9488",// Teal 600
          "primary-hover": "#059669",
          accent: "#F97316",        // Warm Orange
          "accent-hover": "#EA580C",
          "accent-light": "#FFF7ED",
          // Light Mode surfaces
          "bg-light": "#F4FBF8",    // Mint white
          "card-light": "#FFFFFF",
          "border-light": "#E2E8F0",
          "border-mint": "#D1FAE5",
          // Dark Mode surfaces (Deep Navy-Teal, NOT pure black)
          "bg-dark": "#0B1220",     // Deep Navy-Teal
          "bg-dark-subtle": "#0F1B2D",
          "card-dark": "#13233A",   // Navy surface card
          "card-dark-hover": "#162A44",
          "border-dark": "rgba(255, 255, 255, 0.08)",
          "border-dark-teal": "rgba(16, 185, 129, 0.2)",
          // Text Colors
          "text-dark": "#0F172A",   // Slate 900
          "text-muted": "#475569",  // Slate 600
          "text-light": "#E6F1EF",  // Soft light
          "text-light-muted": "#94A3B8", // Slate 400
          // Semantic
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          info: "#3B82F6",
          lost: "#F97316",
          found: "#10B981",
          matched: "#0D9488",
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Devanagari',
          'Noto Sans Bengali',
          'Noto Sans Tamil',
          'Noto Sans Telugu',
          'Noto Sans Gujarati',
          'Noto Sans Gurmukhi',
          'Noto Nastaliq Urdu',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif'
        ],
        heading: [
          'Plus Jakarta Sans',
          'Inter',
          'Noto Sans Devanagari',
          'Noto Sans Bengali',
          'sans-serif'
        ]
      },
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(16, 185, 129, 0.06), 0 2px 8px 0 rgba(0, 0, 0, 0.04)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow-teal': '0 0 24px -4px rgba(16, 185, 129, 0.35)',
        'glow-orange': '0 0 24px -4px rgba(249, 115, 22, 0.35)',
      },
      maxWidth: {
        'content': '1200px',
      }
    },
  },
  plugins: [],
}

