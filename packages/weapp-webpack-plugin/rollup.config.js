import $ from 'lodash';
import packageJson from './package.json';
// import { babel } from '@rollup/plugin-babel';
// import { terser } from 'rollup-plugin-terser';

import commonConfig from '../../rollup.config.common';

export default $.merge(commonConfig, {
  input: './src/index.ts',
  output: [{
    file: packageJson.main,
    format: 'cjs'
  },
  {
    file: packageJson.module,
    format: 'es'
  }
  ],
});
