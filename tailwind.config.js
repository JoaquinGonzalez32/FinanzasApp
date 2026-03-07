// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                // Brand — Indigo
                "primary": "#6366F1",
                "primary-light": "#818CF8",
                "primary-dark": "#4F46E5",
                "primary-faint": "#EEF2FF",

                // Surfaces — Light
                "background-light": "#F8FAFC",
                "surface-light": "#F1F5F9",
                "card-light": "#FFFFFF",
                "input-light": "#F1F5F9",

                // Surfaces — Dark
                "background-dark": "#020617",
                "surface-dark": "#0F172A",
                "card-dark": "#1E293B",
                "input-dark": "#1E293B",
                "modal-dark": "#0F172A",

                // Semantic accents
                "income": "#10B981",
                "income-light": "#ECFDF5",
                "expense": "#EF4444",
                "expense-light": "#FEF2F2",
                "warning": "#F59E0B",
                "warning-light": "#FFFBEB",

                // Aliases for backward compat
                "frost": "#F1F5F9",
                "frost-light": "#F8FAFC",
                "success": "#10B981",
                "success-light": "#D1FAE5",
                "danger": "#EF4444",
                "danger-light": "#FEE2E2",
            },
            fontFamily: {
                sans: ['Manrope_400Regular'],
                'sans-medium': ['Manrope_500Medium'],
                'sans-semibold': ['Manrope_600SemiBold'],
                display: ['Manrope_700Bold'],
                'display-extra': ['Manrope_800ExtraBold'],
            },
            fontSize: {
                '2xs': '10px',
                'display-sm': '28px',
                'display-md': '36px',
                'display-lg': '48px',
            },
            borderRadius: {
                '3xl': '24px',
                '4xl': '32px',
            },
        },
    },
    plugins: [],
}
