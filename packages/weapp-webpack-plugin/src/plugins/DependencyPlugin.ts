import path from 'path';
import { Compiler } from 'webpack';
import { Resolver, createResolver } from '../utils/resolver';
import { IDependencyPluginOptions } from '../types/DependencyPlugin';
import { addEntry, getAppEntry } from '../utils/dependency';
import { DependencyTree } from 'src/modules/DependencyTree';

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
    /** 添加 app 入口文件到 app chunk */
    addEntry(compiler.context, app, 'app', compiler);

    this.context = path.dirname(app);
    this.resolver = createResolver(compiler);

    compiler.hooks.beforeCompile.tapAsync(DependencyPlugin.PLUGIN_NAME, (params, callback) => {
      // console.info('skr: beforeCompile', params);
      callback();
    });
  }
}
