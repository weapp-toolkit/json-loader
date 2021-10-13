import path from 'path';
import fsx from 'fs-extra';
import { Compiler, EntryPlugin } from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
import { Resolver } from '@weapp-toolkit/tools';
import { IWeappAppConfig } from '@weapp-toolkit/weapp-types';
import { APP_GROUP_NAME } from '../utils/constant';
import { addEntryFactory } from '../utils/dependency';
import { DependencyGraph } from '../modules/dependencyGraph';

/**
 * AddEntryPlugin 初始化选项
 */
export interface IAddEntryPluginOptions {
  /** 小程序项目根文件夹，app.json 所在目录 */
  context: string;
  /** 路径解析器 */
  resolver: Resolver;
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
  resolver!: Resolver;

  /** 依赖树 */
  dependencyGraph: DependencyGraph;

  /** 添加 entry 函数 */
  addEntry!: (entry: string, options: EntryPlugin['options']) => void;

  constructor(options: IAddEntryPluginOptions) {
    this.context = options.context;
    this.resolver = options.resolver;
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

    this.watchFileChange(compiler);
    this.copyTabBarIcons(compiler);
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

  /**
   * 复制 TabBar 图标
   * @param compiler
   * @returns
   */
  private copyTabBarIcons(compiler: Compiler) {
    const { resolver, context } = this;
    const resolve = resolver.resolveDependencySync.bind(null, context);
    const appJsonPath = resolve('app.json');
    const appJson: IWeappAppConfig = fsx.readJSONSync(appJsonPath);

    const { tabBar } = appJson;

    if (!tabBar) {
      return;
    }

    const { list = [] } = tabBar;

    /** 获取 TabBar 列表配置里的图标资源 */
    const assets = list.reduce((resources: string[], listItem) => {
      const { iconPath, selectedIconPath } = listItem;
      /** 可能存在图标也可能不存在 */
      if (iconPath) {
        resources.push(resolve(iconPath));
      }
      /** 可能存在选中态图标也可能不存在 */
      if (selectedIconPath) {
        resources.push(resolve(selectedIconPath));
      }
      return resources;
    }, []);

    new CopyPlugin({
      patterns: assets.map((asset) => {
        return {
          from: asset,
          to: path.join(compiler.options.output.path || '', path.relative(context, asset)),
        };
      }),
    }).apply(compiler);
  }
}
