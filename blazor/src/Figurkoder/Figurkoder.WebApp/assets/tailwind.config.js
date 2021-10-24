const colors = require('tailwindcss/colors')
let env = process.env.NODE_ENV
let purge = env?.localeCompare('production', 'en-US', { sensitivity: 'base' }) === 0

console.log('Environment: ', env)
console.log('Purge: ', purge)

module.exports = {
  mode: 'jit',
  purge: {
    enabled: purge,
    content: [
      '../**/*.html',
      '../**/*.razor',
      '../**/*.razor.css'
    ],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        sky: colors.sky,
        cyan: colors.cyan,
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
