// Rollup Configuration for JavaScript bundling
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: 'src/js/main.js',
  output: {
    file: isProduction ? 'public/script.min.js' : 'public/script.js',
    format: 'iife',
    name: 'PremiumGiftBox',
    sourcemap: !isProduction
  },
  plugins: [
    nodeResolve(),
    ...(isProduction ? [terser()] : [])
  ]
};