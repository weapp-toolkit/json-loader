import fsx from 'fs-extra';
import { IWeappAppConfig } from '@weapp-toolkit/weapp-types';
import { Compiler } from 'webpack';
import { Resolver, shouldIgnore } from '@weapp-toolkit/tools';
import { APP_GROUP_NAME, APP_PACKAGE_NAME, CUSTOM_TAB_BAR_CONTEXT } from '../../utils/constant';
import { filterIgnores } from '../../utils/dependency';
import { DependencyGraphNode } from './GraphNode';
import { GraphNodeType } from '.';
import { GraphNodeMap } from './GraphNodeMap';

/**
 * 依赖树初始化选项
 */
export interface IDependencyGraphOptions {
  /** 忽略的路径 */
  ignores?: RegExp[];
  /** 路径解析器 */
  resolver: Resolver;
  /** app 文件夹 */
  context: string;
  /** 入口文件 */
  app: string;
  compiler: Compiler;
}

const DEFAULT_IGNORES = [/^plugin:/];

/** 依赖树 */
export class DependencyGraph extends DependencyGraphNode {
  /** 缓存的节点映射 */
  private _graphNodeMap?: GraphNodeMap;

  public compiler: Compiler;

  constructor(options: IDependencyGraphOptions) {
    const { resolver, context, app, ignores = [], compiler } = options;

    super({
      appRoot: context,
      packageNames: new Set([APP_PACKAGE_NAME]),
      packageGroup: APP_GROUP_NAME,
      resolver,
      ignores: ignores.concat(DEFAULT_IGNORES),
      pathname: app,
      nodeType: GraphNodeType.App,
    });
    this.compiler = compiler;
  }

  /**
   * 构建依赖树
   * @param callback 构建完成回调函数
   */
  public build(): void {
    const { resolve } = this;
    const appJsonPath = resolve('app.json');
    const appJson: IWeappAppConfig = fsx.readJSONSync(appJsonPath);

    super.build();
    this.addAppChunk(appJson);
    /** 根节点要添加自己 */
    this.graphNodeMap.add(this);
    this.graphNodeMap.buildChunkModuleMap();
  }

  /**
   * 获取节点映射
   */
  public getGraphNodeMap(): GraphNodeMap {
    return this._graphNodeMap || (this._graphNodeMap = super.getGraphNodeMap());
  }

  public clearGraphNodeMap() {
    this._graphNodeMap = undefined;
  }

  /**
   * 添加 app chunk
   */
  private addAppChunk(appJson: IWeappAppConfig) {
    const { pages, tabBar } = appJson;

    /** 添加主包里的 pages */
    this.addPageModules(APP_PACKAGE_NAME, APP_GROUP_NAME, pages);
    /** 添加 TabBar */
    this.addTabBar(tabBar);
    /** 添加分包 chunk */
    this.addSubPackageChunk(appJson);
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
      this.addModule({
        packageNames: this.packageNames,
        packageGroup: this.packageGroup,
        resourcePath: tabBarEntryPath,
        nodeType: GraphNodeType.Component,
      });
    }
  }

  /**
   * 添加分包 chunk
   */
  private addSubPackageChunk(appJson: IWeappAppConfig) {
    /** 两种字段在小程序里面都是合法的 */
    const subPackages = appJson.subpackages || appJson.subPackages || [];
    filterIgnores(this.ignores, subPackages, ({ root }) => root).forEach((subPackage) => {
      const { root, pages, independent } = subPackage;
      /** 根据分包路径生成 packageName */
      const packageName = root.replace(/\/$/, '');
      /** 获取分包根绝对路径，从小程序根路径开始查找 */
      const context = this.resolver.resolveDir(this.context, packageName);
      /** 以分包根路径作为 context 生成 resolve 函数 */
      const resolve = this.resolver.resolveDependencySync.bind(null, context);

      /** 如果是独立分包，单独为一个 chunk，否则加入 app chunk */
      this.addPageModules(packageName, independent ? packageName : APP_GROUP_NAME, pages, resolve);
    });
  }

  /**
   * 添加页面节点，可能产生新的package
   * @param packageName
   * @param packageGroup
   * @param resources
   * @param resolve
   */
  private addPageModules(packageName: string, packageGroup: string, resources: string[], resolve = this.resolve) {
    filterIgnores(this.ignores, resources).forEach((resource) => {
      /** 获取路径 */
      const resourcePath = resolve(resource);

      this.addModule({
        packageNames: new Set([packageName]),
        packageGroup,
        resourcePath,
        nodeType: GraphNodeType.Page,
      });
    });
  }
}
