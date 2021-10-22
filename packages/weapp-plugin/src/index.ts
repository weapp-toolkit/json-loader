import path from 'path';
import { Compiler } from 'webpack';
import { DependencyGraph } from '@weapp-toolkit/core';
import { resolveAppEntryPath } from '@weapp-toolkit/tools';
import { AddEntryPlugin } from './plugins/AddEntryPlugin';
import { OptimizeChunkPlugin } from './plugins/OptimizeChunkPlugin';

export interface IWeappPluginOptions {
  /** 忽略的路径 */
  ignores?: RegExp[];
}

export default class WeappPlugin {
  static PLUGIN_NAME = 'WeappPlugin';

  /** 初始化选项 */
  options: IWeappPluginOptions;

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 依赖图 */
  dependencyGraph!: DependencyGraph;

  /** 处理依赖的插件 */
  addEntryPlugin!: AddEntryPlugin;

  /** 处理 chunk 划分的插件 */
  optimizeChunkPlugin!: OptimizeChunkPlugin;

  constructor(options: IWeappPluginOptions = {}) {
    this.options = options;
  }

  public apply(compiler: Compiler): void {
    const app = resolveAppEntryPath(compiler);
    this.context = path.dirname(app);

    const dependencyGraph = DependencyGraph.getInstance({
      app,
      resolveConfig: compiler.options.resolve,
      ignores: this.options.ignores,
    });

    this.dependencyGraph = dependencyGraph;

    this.addEntryPlugin = new AddEntryPlugin({
      context: this.context,
      ignores: this.options.ignores,
      dependencyGraph,
    });
    this.addEntryPlugin.apply(compiler);

    this.optimizeChunkPlugin = new OptimizeChunkPlugin({
      context: this.context,
      ignores: this.options.ignores,
      dependencyGraph,
    });
    this.optimizeChunkPlugin.apply(compiler);
  }
}
