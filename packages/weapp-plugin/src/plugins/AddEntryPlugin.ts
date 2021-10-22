import path from 'path';
import { Compiler, EntryPlugin } from 'webpack';
import { DependencyGraph } from '@weapp-toolkit/core';
import { FileResolver } from '@weapp-toolkit/tools';
import { addEntryFactory } from '../utils/dependency';

/**
 * AddEntryPlugin 初始化选项
 */
export interface IAddEntryPluginOptions {
  /** 小程序项目根文件夹，app.json 所在目录 */
  context: string;
  /** 忽略的文件（夹） */
  ignores?: Array<string | RegExp>;
  /** 依赖树实例 */
  dependencyGraph: DependencyGraph;
}

/**
 * 动态添加小程序 entry
 */
export class AddEntryPlugin {
  static PLUGIN_NAME = 'AddEntryPlugin';

  /** 是否初始化过 */
  private isInitialized = false;

  ignores: Array<string | RegExp>;

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 模块路径解析器 */
  resolver!: FileResolver;

  /** 依赖树 */
  dependencyGraph: DependencyGraph;

  /** 添加 entry 函数 */
  addEntry!: (entry: string, options: EntryPlugin['options']) => void;

  constructor(options: IAddEntryPluginOptions) {
    this.context = options.context;
    this.ignores = options.ignores || [];
    this.dependencyGraph = options.dependencyGraph;
  }

  apply(compiler: Compiler): void {
    this.addEntry = addEntryFactory(compiler).bind(this, this.context);

    compiler.hooks.entryOption.tap(AddEntryPlugin.PLUGIN_NAME, () => {
      // console.info('skr: entryOption');
      this.setEntries();
      return true;
    });

    // this.watchFileChange(compiler);
    // this.copyTabBarIcons(compiler);
  }

  /**
   * 当文件发生变化时
   */
  private watchFileChange(compiler: Compiler) {
    compiler.hooks.watchRun.tap(AddEntryPlugin.PLUGIN_NAME, () => {
      if (!this.isInitialized) {
        this.isInitialized = true;
        return;
      }

      const { graphNodeIndex } = this.dependencyGraph;
      const { modifiedFiles = [], removedFiles = [] } = compiler;
      const modified = Array.from(modifiedFiles);
      const modifiedGraphNode = modified
        .filter((request) => request.endsWith('.json'))
        .map((request) => graphNodeIndex.getNodeByRequest(request));

      console.info('skr: watch', { modifiedFiles, removedFiles });

      if (modifiedGraphNode.length) {
        this.dependencyGraph.rebuild();

        modifiedGraphNode.forEach((graphNode) => {
          if (!graphNode) {
            return;
          }

          console.info('skr: rebuild', graphNode.resourcePath);

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

    compiler.hooks.make.tap(AddEntryPlugin.PLUGIN_NAME, (compilation) => {
      if (!this.isInitialized) {
        return;
      }

      console.info('skr: watch make', {
        entries: compilation.entries,
        entrypoints: compilation.entrypoints,
      });
    });
  }

  /**
   * 添加项目所有依赖
   */
  private setEntries(): void {
    const { graphNodeIndex } = this.dependencyGraph;

    graphNodeIndex.nodes.forEach((module) => {
      const { resourcePath, chunkInfos } = module;

      if (!module.isEntryNode()) {
        return;
      }

      chunkInfos.forEach(({ id, group }) => {
        this.addEntry(resourcePath, {
          name: id,
          runtime: path.join(group, 'runtime'),
        });
      });
    });
  }
}
