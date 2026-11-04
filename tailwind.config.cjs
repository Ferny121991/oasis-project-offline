module.exports = {
  content: ['./index.html', './*.tsx', './constants.ts', './components/**/*.{ts,tsx}'],
  safelist: ['text-6xl', 'text-7xl', 'text-8xl', 'text-9xl', 'text-[10rem]', 'text-[12rem]', 'text-[14rem]'],
  theme: { extend: { colors: { gray: { 850: '#172033' } } } },
  plugins: [],
};
