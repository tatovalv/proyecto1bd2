/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        tec: {
          navy: "#0b1f3a",
          blue: "#1e4d8c",
          sky: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};
