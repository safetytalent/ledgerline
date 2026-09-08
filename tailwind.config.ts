import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213D",
        ink2: "#1D2F52",
        paper: "#F6F4EF",
        paper2: "#EEEAE1",
        line: "#DAD4C6",
        brass: "#B8862F",
        brassSoft: "#F0E0BE",
        teal: "#1B4B43",
        tealSoft: "#DCE9E5",
        rust: "#9B3A26",
        rustSoft: "#F1DCD5",
        ink3: "#263760",
        // Added for the Documents & Forms Library screen — reuses the
        // existing ink/paper/brass/teal/rust palette above wherever a
        // close match exists, and adds only the few tones that don't:
        // a deeper brass, and two muted text tones for label/caption text.
        brassDeep: "#7D5B2C",
        inkSoft: "#524E3F",
        inkFaint: "#8A8571",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
