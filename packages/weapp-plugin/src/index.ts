import path from 'path';
import { Compiler } from 'webpack';
import { createResolver, resolveAppEntryPath } from '@weapp-toolkit/core';
import { DependencyGraph } from './modules/dependencyGraph';
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

  /** 依赖树 */
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

    const resolver = createResolver(compiler, this.context);
    const dependencyGraph = new DependencyGraph({
      context: this.context,
      app,
      resolver,
      compiler,
    });
    dependencyGraph.build();
    this.dependencyGraph = dependencyGraph;

    this.addEntryPlugin = new AddEntryPlugin({
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

    this.watchFileChange(compiler);
  }

  /**
   * 当文件发生变化时
   */
  private watchFileChange(compiler: Compiler) {
    compiler.hooks.watchRun.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
      const graphNodeMap = this.dependencyGraph.getGraphNodeMap();
      const { modifiedFiles = [], removedFiles = [] } = compiler;
      console.info('skr: watch', { modifiedFiles, removedFiles });

      if (Array.from(modifiedFiles).length) {
        modifiedFiles.forEach((filepath) => {});
      }
    });

    compiler.hooks.beforeCompile.tap(OptimizeChunkPlugin.PLUGIN_NAME, (params) => {
      // console.info('skr: beforeCompile', params);
      params.normalModuleFactory.hooks.beforeResolve.tap(OptimizeChunkPlugin.PLUGIN_NAME, (resolvedData) => {
        // console.info('skr: beforeResolve', resolvedData.request);
      });
    });
  }
}
