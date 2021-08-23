import { Compiler } from 'webpack';
import { Resolver } from '../utils/resolver';
import { IDependencyPluginOptions } from '../types/DependencyPlugin';
import { DependencyTree } from '../modules/dependency/DependencyTree';

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

  constructor(options: IDependencyPluginOptions) {
    this.dependencyTree = options.dependencyTree;
  }

  apply(compiler: Compiler): void {

  }
}
