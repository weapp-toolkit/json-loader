const path = require('path');

module.exports = {
  plugins: {
    'postcss-partial-import': {
      path: [path.resolve(__dirname, 'miniprogram')],
    },
    'postcss-font-base64': {}, // font to base64
    'postcss-advanced-variables': {},
    'postcss-nested': {},
    'postcss-custom-properties': {
      preserve: false,
    },
    'postcss-color-function': {},
    'postcss-css-variables': {},
    'postcss-url': {
      url: 'inline', // inline image to base64
    },
    'postcss-discard-comments': {}, // 删掉打包注释
    autoprefixer: {},
  },
};
