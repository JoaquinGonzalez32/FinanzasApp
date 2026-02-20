// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                "primary": "#137fec",
                "background-light": "#f6f7f8",
                "background-dark": "#101922",
                "card-dark": "#1c2632",
                "surface-dark": "#1a242f",
                "input-dark": "#283039",
                "modal-dark": "#111418",
            },
            fontFamily: {
                sans: ['Manrope_400Regular'],
                display: ['Manrope_700Bold'],
            },
            boxShadow: {
                'ios': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }
        },
    },
    plugins: [],
}
