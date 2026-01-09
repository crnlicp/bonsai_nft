/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#a78bfa',
                    dark: '#7c3aed',
                },
                secondary: {
                    DEFAULT: '#22d3ee',
                    dark: '#06b6d4',
                },
                dark: {
                    bg: '#0f0f1e',
                    card: '#1a1a2e',
                    border: '#3b3d5c',
                }
            },
            fontFamily: {
                mono: ['Courier New', 'monospace'],
            }
        },
    },
    plugins: [],
}
