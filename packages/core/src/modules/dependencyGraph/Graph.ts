import path from 'path';
import fsx from 'fs-extra';
import { Configuration } from 'webpack';
import { IWeappAppConfig } from '@weapp-toolkit/weapp-types';
import { FileResolver } from '@weapp-toolkit/tools';
import { APP_PACKAGE_NAME, CUSTOM_TAB_BAR_CONTEXT } from '../../utils/constant';
import { GraphNode } from './GraphNode';
import { GraphNodeType } from './types';
import GraphNodeIndex from './GraphNodeIndex';
import { checkAppFilepath, container, validateAppJson } from './utils';
import GraphNodeFactory from './GraphNodeFactory';
import { DI_TYPES } from './constant';
import PackageManager from '../PackageManager';
import GraphUtil from './GraphUtil';

/**
 * 依赖树初始化选项
 */
export interface GraphOptions {
  /** 入口文件 */
  app: string;
  /** 忽略的路径 */
  ignores?: RegExp[];
  /** webpack resolve 配置 */
  resolveConfig: Configuration['resolve'];
}

/** 依赖树 */
export class DependencyGraph extends GraphNode {
  static TAG = 'DependencyGraph';

  static instance?: DependencyGraph;

  private _graphNodeIndex?: GraphNodeIndex;

  public graphUtil: GraphUtil;

  constructor(options: GraphOptions) {
    const { app, ignores = [], resolveConfig } = options;

    checkAppFilepath(app);

    const context = path.dirname(app);
    const resolver = new FileResolver(resolveConfig, context);
    const packageManager = new PackageManager();

    container.set(DI_TYPES.FileResolver, resolver);
    container.set(DI_TYPES.PackageManager, packageManager);
    container.set(DI_TYPES.GraphNodeFactory, new GraphNodeFactory({ ignores, resolver }));

    packageManager.set(APP_PACKAGE_NAME, { root: '' });

    super({
      appRoot: context,
      packageNames: new Set([APP_PACKAGE_NAME]),
      resourcePath: app,
      nodeType: GraphNodeType.App,
    });

    this.build();
    this.graphUtil = new GraphUtil(this);
  }

  static getInstance(options?: GraphOptions): DependencyGraph {
    if (!DependencyGraph.instance && !options) {
      throw new Error(`[${DependencyGraph.TAG}] 你必须先传入 options 进行初始化`);
    }

    return DependencyGraph.instance || (DependencyGraph.instance = new DependencyGraph(options!));
  }

  /** 图节点索引 */
  public get graphNodeIndex(): GraphNodeIndex {
    return this._graphNodeIndex || (this._graphNodeIndex = this.graphNodeFactory.nodeIndex.add(this));
  }

  /**
   * 构建依赖树
   * @param callback 构建完成回调函数
   */
  public build(): void {
    const { resolve } = this;
    const appJsonPath = resolve('app.json');
    const appJson: IWeappAppConfig = fsx.readJSONSync(appJsonPath);

    validateAppJson(appJson);

    super.build();
    this.addAppChunk(appJson);
    this.graphNodeIndex.initGraphNodes();
  }

  /**
   * 重构依赖树
   */
  public rebuild(): void {
    /**
     * 小心内存泄漏
     * @TODO
     */
    this._graphNodeIndex = undefined;
    this.graphNodeFactory.cleanCache();

    this.build();
  }

  /**
   * 添加 app chunk
   */
  private addAppChunk(appJson: IWeappAppConfig) {
    const { pages, tabBar } = appJson;

    /** 添加主包里的 pages */
    this.addPageNodes(APP_PACKAGE_NAME, this.context, pages);
    /** 添加 TabBar */
    this.addTabBar(tabBar);
    /** 添加分包 chunk */
    this.addSubPackages(appJson);
  }

  /**
   * 添加 TabBar
   */
  private addTabBar(tabBar: IWeappAppConfig['tabBar']) {
    if (!tabBar) {
      return;
    }

    const { custom } = tabBar;

    /** 如果是自定义 TabBar，解析自定义 TabBar 文件夹依赖 */
    if (custom) {
      const tabBarEntryPath = this.resolve(CUSTOM_TAB_BAR_CONTEXT);
      this.addNode({
        reference: tabBarEntryPath,
        nodeType: GraphNodeType.Component,
      });
    }
  }

  /**
   * 添加分包 chunk
   */
  private addSubPackages(appJson: IWeappAppConfig) {
    /** 两种字段在小程序里面都是合法的 */
    const subPackages = appJson.subpackages || appJson.subPackages || [];
    subPackages.forEach((subPackage) => {
      const { root, pages, independent } = subPackage;
      /** 根据分包路径生成 packageName */
      const packageName = root.replace(/\/$/, '');
      const context = path.join(this.context, packageName);

      /** 如果是独立分包，单独为一个 chunk，否则加入 app chunk */
      this.packageManager.set(packageName, { independent, root: packageName });
      this.addPageNodes(packageName, context, pages);
    });
  }

  /**
   * 添加页面节点
   * @param packageName
   * @param references
   * @param resolve
   */
  private addPageNodes(packageName: string, context: string, references: string[]) {
    references.forEach((reference) => {
      this.addNode({
        packageNames: new Set([packageName]),
        context,
        reference,
        nodeType: GraphNodeType.Page,
      });
    });
  }
}
