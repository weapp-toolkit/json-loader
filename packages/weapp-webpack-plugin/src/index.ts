import { Compiler } from 'webpack';
import { DependencyPlugin } from './plugins/DependencyPlugin';

export interface IWeappWebpackPluginOptions {
  ignore?: [];
}

export default class WeappWebpackPlugin {
  static PLUGIN_NAME = 'WeappWebpackPlugin';

  /** 初始化选项 */
  options: IWeappWebpackPluginOptions;

  /** 处理依赖的插件 */
  dependencyPlugin!: DependencyPlugin;

  constructor(options: IWeappWebpackPluginOptions = {}) {
    this.options = options;
  }

  public apply(compiler: Compiler): void {
    console.info('skr: app', compiler.context);

    this.dependencyPlugin = new DependencyPlugin({
      ignore: this.options.ignore,
    });
    this.dependencyPlugin.apply(compiler);
  }
}
