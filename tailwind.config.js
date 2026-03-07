// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // Brand
                "primary": "#137fec",
                "primary-light": "#4da3f7",
                "primary-dark": "#0b5fbd",

                // Surfaces — light (frost glass)
                "background-light": "#e8edf6",
                "card-light": "#ffffff",
                "surface-light": "#dfe5f0",

                // Frost tokens
                "frost": "#dce3f0",
                "frost-light": "#eaeff8",

                // Surfaces — dark
                "background-dark": "#0c1117",
                "card-dark": "#161f2a",
                "surface-dark": "#1a242f",
                "input-dark": "#232d38",
                "modal-dark": "#0e141b",

                // Semantic accents
                "success": "#10b981",
                "success-light": "#d1fae5",
                "danger": "#ef4444",
                "danger-light": "#fee2e2",
                "warning": "#f59e0b",
                "warning-light": "#fef3c7",
            },
            fontFamily: {
                sans: ['Manrope_400Regular'],
                display: ['Manrope_700Bold'],
            },
            borderRadius: {
                '3xl': '24px',
                '4xl': '32px',
            },
        },
    },
    plugins: [],
}
