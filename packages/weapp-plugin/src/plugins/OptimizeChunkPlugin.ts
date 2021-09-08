import { Compiler, Module, optimize } from 'webpack';
import { Resolver } from '@weapp-toolkit/core';
import { ISplitChunkPluginOptions } from '../types/OptimizeChunkPlugin';
import { DependencyTree } from '../modules/dependency/DependencyTree';
// import { SplitChunksPlugin } from 'webpack';

/**
 * 处理小程序依赖以及依赖分析
 */
export class OptimizeChunkPlugin {
  static PLUGIN_NAME = 'OptimizeChunkPlugin';

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 模块路径解析器 */
  resolver!: Resolver;

  /** 依赖树 */
  dependencyTree!: DependencyTree;

  splitChunksPlugin!: optimize.SplitChunksPlugin;

  constructor(options: ISplitChunkPluginOptions) {
    this.dependencyTree = options.dependencyTree;
  }

  apply(compiler: Compiler): void {
    compiler.hooks.environment.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
      const splitChunksConfig = compiler.options.optimization.splitChunks;
      const processedConfig: typeof splitChunksConfig = {
        ...splitChunksConfig,
        minChunks: 1,
        minSize: 1,
        chunks: 'all',
        name(m: Module) {
          return false;
        },
      };
      compiler.options.optimization.splitChunks = processedConfig;
    });
  }
}
