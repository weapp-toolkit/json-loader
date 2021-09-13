import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import { babel } from '@rollup/plugin-babel';
// import json from '@rollup/plugin-json';
// import { terser } from 'rollup-plugin-terser';

export default {
  onwarn(warning) {
    // Suppress this error message... there are hundreds of them. Angular team says to ignore it.
    // https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
    if (warning.code === 'THIS_IS_UNDEFINED') {
      return;
    }
    console.error(warning.message);
  },
  plugins: [
    typescript({
      // tsconfig: 'tsconfig.json',
      exclude: ['**/node_modules/**'],
    }),
    nodeResolve(),
    commonjs(),
    babel({
      exclude: '**/node_modules/**',
    }),

    // json()
    // terser()
  ],
  external(id) {
    return id.indexOf('node_modules') >= 0;
  },
};
