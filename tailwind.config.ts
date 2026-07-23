import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        'cursive': ['Caveat', 'cursive'],
        'display': ['Fraunces', 'Georgia', 'serif'],
        'serif': ['Fraunces', 'Georgia', 'serif'],
        'sans': ['Manrope', 'system-ui', 'sans-serif'],
        'heading': ['Manrope', 'system-ui', 'sans-serif'],
        'handwriting': ['Caveat', 'cursive'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
        brand: {
          amber: "hsl(var(--brand-amber))",
          ember: "hsl(var(--brand-ember))",
          pink: "hsl(var(--brand-pink))",
        },
        success: "hsl(var(--success))",
        "line-strong": "hsl(var(--line-strong))",
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        deck: {
          blue: "hsl(var(--deck-blue))",
          red: "hsl(var(--deck-red))",
          green: "hsl(var(--deck-green))",
          purple: "hsl(var(--deck-purple))",
          yellow: "hsl(var(--deck-yellow))",
          pink: "hsl(var(--deck-pink))",
          teal: "hsl(var(--deck-teal))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "float-1": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "25%": {
            transform: "translate(30px, -20px) scale(1.05)",
          },
          "50%": {
            transform: "translate(-20px, 30px) scale(0.95)",
          },
          "75%": {
            transform: "translate(-30px, -10px) scale(1.02)",
          },
        },
        "float-2": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "25%": {
            transform: "translate(-25px, 25px) scale(0.98)",
          },
          "50%": {
            transform: "translate(35px, -15px) scale(1.04)",
          },
          "75%": {
            transform: "translate(15px, 35px) scale(0.96)",
          },
        },
        "float-3": {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "33%": {
            transform: "translate(40px, 20px) scale(1.03)",
          },
          "66%": {
            transform: "translate(-30px, -25px) scale(0.97)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float-1": "float-1 20s ease-in-out infinite",
        "float-2": "float-2 25s ease-in-out infinite",
        "float-3": "float-3 18s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
