/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hotel: {
          sand: '#F8EFE0',
          cream: '#FFF8EE',
          clay: '#C96A28',
          bark: '#2F2418',
          olive: '#5F7A43',
          dusk: '#1D293D',
          mist: '#EAF0F7'
        }
      },
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 35px -20px rgba(17, 24, 39, 0.45)'
      }
    }
  },
  plugins: []
};
