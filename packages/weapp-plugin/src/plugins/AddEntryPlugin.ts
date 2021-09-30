import path from 'path';
import { Compiler, EntryPlugin } from 'webpack';
import { createResolver, resolveAppEntryPath, Resolver } from '@weapp-toolkit/core';
import { APP_GROUP_NAME } from '../utils/constant';
import { addEntryFactory } from '../utils/dependency';
import { DependencyGraph } from '../modules/dependencyGraph';

/**
 * AddEntryPlugin 初始化选项
 */
export interface IAddEntryPluginOptions {
  ignores?: Array<string | RegExp> /** 忽略的文件（夹） */;
  dependencyGraph: DependencyGraph /** 依赖树实例 */;
}

/**
 * 冬天添加小程序 entry
 */
export class AddEntryPlugin {
  static PLUGIN_NAME = 'AddEntryPlugin';

  ignores: Array<string | RegExp>;

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 模块路径解析器 */
  resolver!: Resolver;

  /** 依赖树 */
  dependencyGraph: DependencyGraph;

  /** 添加 entry 函数 */
  addEntry!: (entry: string, options: EntryPlugin['options']) => void;

  constructor(options: IAddEntryPluginOptions) {
    this.ignores = options.ignores || [];
    this.dependencyGraph = options.dependencyGraph;
  }

  apply(compiler: Compiler): void {
    const app = resolveAppEntryPath(compiler);

    this.context = path.dirname(app);
    this.resolver = createResolver(compiler, this.context);
    this.addEntry = addEntryFactory(compiler).bind(this, this.context);

    compiler.hooks.entryOption.tap(AddEntryPlugin.PLUGIN_NAME, () => {
      this.setAllEntries();
      return true;
    });

    this.watchFileChange(compiler);
  }

  /**
   * 当文件发生变化时
   */
  private watchFileChange(compiler: Compiler) {
    compiler.hooks.watchRun.tap(AddEntryPlugin.PLUGIN_NAME, () => {
      const graphNodeMap = this.dependencyGraph.getGraphNodeMap();
      const { modifiedFiles = [], removedFiles = [] } = compiler;
      const modified = Array.from(modifiedFiles);
      const modifiedGraphNode = modified
        .filter((request) => request.endsWith('.json'))
        .map((request) => graphNodeMap.getNodeByRequest(request));

      console.info('skr: watch', { modifiedFiles, removedFiles });

      if (modifiedGraphNode.length) {
        this.dependencyGraph.clearGraphNodeMap();

        modifiedGraphNode.forEach((graphNode) => {
          if (!graphNode) {
            return;
          }

          console.info('skr: rebuild', graphNode.pathname);

          /** 重新扫描依赖 */
          graphNode.rebuild();
        });
      }
    });

    compiler.hooks.beforeCompile.tap(AddEntryPlugin.PLUGIN_NAME, (params) => {
      // console.info('skr: beforeCompile', params);
      params.normalModuleFactory.hooks.beforeResolve.tap(AddEntryPlugin.PLUGIN_NAME, (resolvedData) => {
        // console.info('skr: beforeResolve', resolvedData.request);
      });
    });
  }

  /**
   * 添加项目所有依赖
   */
  private setAllEntries(): void {
    const graphNodeMap = this.dependencyGraph.getGraphNodeMap();

    graphNodeMap.modules.forEach((module) => {
      const { pathname, packageGroup, chunkName } = module;

      this.addEntry(pathname, {
        name: chunkName,
        runtime:
          /**
           * 和 runtime 生成位置有关，并让目录结构更好看
           * app 分组本身位于小程序根目录，这里不特殊处理
           * 会将 runtime 生成到名为 APP_GROUP_NAME 的目录下
           */
          packageGroup === APP_GROUP_NAME
            ? `${path.basename(packageGroup)}.runtime`
            : path.join(packageGroup, `${path.basename(packageGroup)}.runtime`),
      });
    });
  }
}
