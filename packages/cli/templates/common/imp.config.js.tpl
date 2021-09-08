const path = require('path');

module.exports = {
  type: '<%=type%>',
  componentLib: '<%=componentLib%>',
  language: '<%=language%>',
  appId: '<%=appId%>',
  srcRoot: '<%=srcRoot%>', // 小程序开发目录，如 ./miniprogram、./src
  privateKeyPath: '<%=privateKeyPath%>', // 小程序 private key 路径，请手动设置
  baseDir: '<%=baseDir%>', // 指定工作区中小程序项目路径
  output: 'dist', // 输出目录，基于 baseDir
  ignore: [<% if (language == 'ts') { %>'**/typings/**'<% } %>], // 要忽略的文件夹，基于 srcRoot
  whitelist: ['custom-tab-bar'], // 白名单文件（夹）不会被忽略
  clearIgnore: ['**/miniprogram_npm/**'], // 清除构建时要忽略的文件夹，基于 output
  cssPreprocessor: '<%=cssPreprocessor%>', // css 预处理器，'postcss'、'less'、'sass'
  typeInline: true, // 类型文件是否和业务代码放一起
  // 页面文件中 json 文件的默认配置项，用于初始化页面 json 文件
  pageDefaultConfig: {
    backgroundColor: '#F2F2F2', // 额外用于初始化页面样式文件
  },
  // 配置路径别名，可手动配置 tsconfig.json 和 .vscode/settings.json{path-intellisense.mappings}
  paths: {
    '@': path.resolve(__dirname, '<%=baseDir%>', '<%=srcRoot%>'),
  },
  babelrc: {
    presets: [<% if (language == 'ts') { %>'@babel/preset-typescript'<% } %>],
    plugins: [
      '@babel/plugin-proposal-class-properties'
    ]
  }
};
