import path from 'path';
import { Compiler } from 'webpack';
import { createResolver, Resolver } from '../utils/resolver';
import { IDependencyPluginOptions } from '../types/DependencyPlugin';
import { getAppEntry } from '../utils/dependency';
import { DependencyTree } from '../modules/dependency/DependencyTree';

/**
 * 处理小程序依赖以及依赖分析
 */
export class DependencyPlugin {
  static PLUGIN_NAME = 'DependencyPlugin';

  public options: IDependencyPluginOptions;

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 模块路径解析器 */
  resolver!: Resolver;

  /** 依赖树 */
  dependencyTree!: DependencyTree;

  constructor(options: IDependencyPluginOptions) {
    this.options = options;
  }

  apply(compiler: Compiler): void {
    const app = getAppEntry(compiler);

    this.context = path.dirname(app);
    this.resolver = createResolver(compiler, this.context);
    this.dependencyTree = new DependencyTree({
      context: this.context,
      app,
      resolver: this.resolver,
      compiler,
    });
    const buildTree = this.dependencyTree.build();

    compiler.hooks.beforeCompile.tapAsync(DependencyPlugin.PLUGIN_NAME, async (params, callback) => {
      await buildTree;
      console.info(
        'skr: app dep tree',
        await this.dependencyTree.getChunkEntries('app'),
      );
      console.info(
        'skr: app assets tree',
        await this.dependencyTree.getChunkAssets('app'),
      );
      // console.info('skr: beforeCompile', params);
      callback();
    });
  }
}
