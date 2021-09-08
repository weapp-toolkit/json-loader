export interface CustomConfig {
  updateDate: string;
  needUpdate: boolean;
  latestVersion: string;
  registry: string | boolean;
  [key: string]: any;
}

export interface ImpConfig {
  type: 'native' | 'kbone';
  componentLib?: boolean; // 是否组件库开发模式
  language: 'js' | 'ts';
  appId: string; // 小程序 app id
  privateKeyPath: string; // 小程序 private key 路径
  srcRoot: string; // 小程序开发目录，相对路径，如 ./miniprogram、./src
  baseDir: string; // 指定工作区中小程序项目路径，相对路径
  output: string; // 输出目录，基于 baseDir，相对路径
  ignore: string[]; // glob，忽略文件夹或文件，基于 srcRoot，如 ['kbone/*']
  whitelist: string[]; // glob，白名单文件（夹），不会被 ignore 忽略，基于 srcRoot，如 ['custom-tab-bar']
  clearIgnore: string[]; // glob，执行 imp --clear 清除构建时忽略的文件夹或文件，基于 srcRoot，如 ['**/kbone/**']
  cssPreprocessor: 'postcss' | 'less' | 'sass'; // css 预处理器，'postcss'、'less'、'sass'
  typeInline: boolean; // 类型文件是否和业务代码放一起
  pageDefaultConfig: Record<string, any> & {
    // 页面文件中 json 文件的默认配置项，用于初始化页面 json 文件
    component?: boolean;
    usingComponents: Record<string, string>;
    navigationBarTitleText?: string;
    backgroundColor?: string;
  };
  paths: Record<string, string>; // 绝对路径
  babelrc: Record<string, string>; // babel config
  npmRegistry: string;
}

export interface ImpCliOptions {
  workspaceRoot: string; // 工作区根目录
  cliPath: string; // 脚手架工程目录
}

export interface ImpContext {
  mpRoot: string; // 小程序 project.config.json 所在目录，绝对路径，即小程序根目录
  cliPath: string; // 脚手架工程目录，绝对路径
  srcRoot: string; // 开发根目录，绝对路径，如 /User/xxx/miniprogram
  distRoot: string; // 输出根目录，绝对路径，如 /User/xxx/dist
  config: ImpConfig; // imp.config.js 的内容
  customConfigPath: string; // 用户配置文件地址
  customConfig: Partial<CustomConfig>; // 用户配置文件
  npm: (args: string[], options?: cp.SpawnOptionsWithoutStdio) => Promise<any>; // 封装了 registry 的 npm 指令
}
