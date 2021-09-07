import path from 'path';
import { Compiler } from 'webpack';
import { DependencyTree } from './modules/dependency/DependencyTree';
import { DependencyPlugin } from './plugins/DependencyPlugin';
import { OptimizeChunkPlugin } from './plugins/OptimizeChunkPlugin';
import { createResolver, resolveAppEntryPath } from '@weapp-toolkit/core';
import { OutputPathPlugin } from './plugins/OutputPathPlugin';

export interface IWeappPluginOptions {
  ignore?: [];
}

export default class WeappPlugin {
  static PLUGIN_NAME = 'WeappPlugin';

  /** 初始化选项 */
  options: IWeappPluginOptions;

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 依赖树 */
  dependencyTree!: DependencyTree;

  /** 处理依赖的插件 */
  dependencyPlugin!: DependencyPlugin;

  /** 处理 chunk 划分的插件 */
  optimizeChunkPlugin!: OptimizeChunkPlugin;

  /** 处理输出路径的插件 */
  outputPathPlugin!: OutputPathPlugin;

  constructor(options: IWeappPluginOptions = {}) {
    this.options = options;
  }

  public apply(compiler: Compiler): void {
    const app = resolveAppEntryPath(compiler);
    this.context = path.dirname(app);

    const resolver = createResolver(compiler, this.context);
    const dependencyTree = new DependencyTree({
      context: this.context,
      app,
      resolver,
      compiler,
    });
    this.dependencyTree = dependencyTree;

    this.dependencyPlugin = new DependencyPlugin({
      ignore: this.options.ignore,
      dependencyTree,
    });
    this.dependencyPlugin.apply(compiler);

    this.optimizeChunkPlugin = new OptimizeChunkPlugin({
      dependencyTree,
    });
    this.optimizeChunkPlugin.apply(compiler);

    this.outputPathPlugin = new OutputPathPlugin({
      context: this.context,
    });
    this.outputPathPlugin.apply(compiler);
  }
}
