/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // MIN-HEIGHT breakpoints
        "h-sm": { raw: "(min-height: 600px)" },
        "h-md": { raw: "(min-height: 800px)" },
        "h-lg": { raw: "(min-height: 900px)" },
      },
      fontFamily: {
        text: ["Open Sans", "serif"],
        title: ["Poppins", "serif"],
        montserrat: ["Montserrat", "serif"],
        cinzel: ["Cinzel", "serif"],
        "cinzel-decorative": ["Cinzel Decorative", "serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        shimmer: "shimmer 4s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": {backgroundPosition: "0% 50%"},
          "100%": {backgroundPosition: "200% 50%"},
        },
      },
    },
  },
  plugins: [],
};
