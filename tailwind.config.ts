import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  // Koyu tema html.dark ile açılır; `.zemin-acik` kabının içinde (koyu temada açık renkli tuval zemini) kapanır.
  darkMode: ["variant", "&:is(.dark *):not(.zemin-acik *)"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
          50: "#ecfdf5",
          100: "#d1fae5",
          600: "#059669",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
        // Ada / sınıf paleti (adalar.module.css ve sinif.module.css ile aynı): bg-ada-deniz, text-ada-murekkep …
        ada: {
          murekkep: "#15302d",
          "murekkep-2": "#3c5a56",
          fildisi: "#fbf7ee",
          kum: "#efe5d0",
          altin: "#b9884a",
          deniz: "#216a78",
          "deniz-koyu": "#0f4c57",
          vurgu: "#2a9d94",
          mercan: "#d9805f",
          lavanta: "#7f88c4",
          fener: "#c99a52",
        },
        math: {
          point: "#2563eb",
          line: "#0284c7",
          circle: "#8b5cf6",
          polygon: "#10b981",
          angle: "#f59e0b",
          selected: "#ec4899",
          grid: "hsl(var(--grid-color))",
          axis: "hsl(var(--axis-color))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        elevated: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
