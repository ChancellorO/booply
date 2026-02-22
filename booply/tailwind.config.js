/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./constants/**/*.{js,jsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: { 
        sans: ["DMSans_400Regular", ...fontFamily.sans],
        medium: ["DMSans_500Medium", ...fontFamily.sans],
        bold: ["DMSans_700Bold", ...fontFamily.sans],
      }
    },
  },
  plugins: [],
};