import path from 'path';
import fsx from 'fs-extra';
import { replaceExt, Resolver, removeExt } from '@weapp-toolkit/core';
import { IWeappComponentConfig, IWeappPageConfig, CachedFunction } from '@weapp-toolkit/weapp-types';
import { isInSubPackage } from '../../utils/dependency';
import { APP_GROUP_NAME, APP_PACKAGE_NAME, PKG_OUTSIDE_DEP_DIRNAME } from '../../utils/constant';
import { shouldIgnore } from '../../utils/ignore';
import { GraphNodeMap } from './GraphNodeMap';

export enum GraphNodeType {
  App,
  Page,
  Component,
  Other,
}

export interface IDependencyGraphNode {
  /** app 根绝对路径 */
  appRoot: string;
  /** 分包名 */
  packageNames: Set<string>;
  /** 分包分组名 */
  packageGroup: string;
  /** 依赖绝对路径 */
  pathname: string;
  /** 模块路径解析工具 */
  resolver: Resolver;
  /** 忽略的路径 */
  ignores: RegExp[];
  /** 节点类型 */
  nodeType: GraphNodeType;
}

function recursiveAddPackageNames(node: DependencyGraphNode, packageName: string) {
  if (!node.packageNames.has(packageName)) {
    node.packageNames.add(packageName);
    node.outgoingNodes.forEach((outgoingModule) => {
      recursiveAddPackageNames(outgoingModule, packageName);
    });
  }
}

/**
 * @name 依赖树节点
 * @description
 * 可获取依赖的所有依赖
 * 粒度分析：分包分组 > 分包 > chunk:
 *  - 非独立分包均属于 app 分组，只有独立分包属于独立分组
 *  - 每个分包均属于分包粒度
 *  - 每个页面或组件均为独立的 chunk 粒度
 */
export class DependencyGraphNode {
  /** 信号量，标记是否正在遍历，避免循环 */
  private _isVisiting = false;

  /** 依赖文件名 */
  private _basename!: string;

  /** 区块名（跨分包时，同一个文件的 chunk 将会不同） */
  private _chunkName!: string;

  /** 模块路径解析工具 */
  public resolver: Resolver;

  /** 模块路径解析，不带扩展名默认解析 js、ts 文件 */
  public resolve: (pathname: string) => string;

  /** app 根路径 */
  public appRoot: string;

  /** 忽略的路径 */
  public ignores: RegExp[];

  /** 分包名 */
  public packageNames = new Set<string>();

  /** 分包分组名 */
  public packageGroup: string;

  /** 依赖绝对路径 */
  public pathname: string;

  /** 依赖文件夹绝对路径 */
  public context: string;

  /** 父节点 （依赖了该节点的节点） */
  public incomingNodes = new Set<DependencyGraphNode>();

  /** 子节点 （该节点依赖的节点） */
  public outgoingNodes = new Set<DependencyGraphNode>();

  /** 静态资源依赖 */
  public assets = new Set<string>();

  /** 图节点映射管理 */
  public graphNodeMap = new GraphNodeMap();

  public nodeType: GraphNodeType;

  constructor(options: IDependencyGraphNode) {
    const { appRoot, pathname, resolver, ignores, packageNames, packageGroup, nodeType } = options;
    const context = path.dirname(pathname);

    this.appRoot = appRoot;
    this.packageGroup = packageGroup;
    this.pathname = pathname;
    this.context = context;
    this.resolver = resolver;
    this.resolve = resolver.resolveDependencySync.bind(null, context);
    this.ignores = ignores;
    this.nodeType = nodeType;
    packageNames.forEach((packageName) => {
      this.packageNames.add(packageName);
    });
  }

  /** 依赖文件名 */
  public get basename(): string {
    if (!this._basename) {
      this._basename = path.basename(this.pathname);
    }
    return this._basename;
  }

  /** chunk 名，用于生成 entry（跨分包时，同一个文件的 chunk 将会不同） */
  public get chunkName(): string {
    const { appRoot, packageGroup, pathname, packageNames } = this;
    if (!this._chunkName) {
      const relativePath = path.relative(appRoot, removeExt(pathname));

      if (packageGroup === APP_GROUP_NAME) {
        if (packageNames.size === 1) {
          /** 只被一个主包或分包引用了 */
          let packageName = '';
          packageNames.forEach((n) => (packageName = n));
          /** 若只被一个普通分包引用了，且pathname不在该分包，调整到对应的包内 */
          this._chunkName =
            packageName !== APP_PACKAGE_NAME && !isInSubPackage(relativePath, packageName)
              ? path.join(packageName, PKG_OUTSIDE_DEP_DIRNAME, relativePath)
              : relativePath;
        } else {
          this._chunkName = relativePath;
        }
      } else {
        /** 如果不是主包分组的依赖，调整其模块到独立分包下 */
        this._chunkName = isInSubPackage(relativePath, packageGroup)
          ? relativePath
          : path.join(packageGroup, PKG_OUTSIDE_DEP_DIRNAME, relativePath);
      }
    }

    return this._chunkName;
  }

  /** 是否独立分包 */
  public get independent(): boolean {
    return this.packageGroup !== APP_GROUP_NAME;
  }

  /**
   * 扫描 json 依赖，添加同名依赖（wxml、wxs 等）
   */
  public build(): void {
    if (this._isVisiting) {
      return;
    }

    this._isVisiting = true;

    const { resolve, basename } = this;

    const jsonPath = resolve(replaceExt(basename, '.json'));
    const json: IWeappPageConfig | IWeappComponentConfig = fsx.readJSONSync(jsonPath);

    this.addOutgoingNodes(Object.values(json.usingComponents || {}));

    this._isVisiting = false;
  }

  /**
   * 重新扫描 json 依赖，添加同名依赖（wxml、wxs 等）
   */
  public rebuild(): void {
    this.graphNodeMap.clear();
    this.outgoingNodes.clear();

    this.build();
  }

  /** 递归所有的子节点映射 */
  public getGraphNodeMap(): GraphNodeMap {
    if (this._isVisiting) {
      /** 返回一个空的 GraphNodeMap */
      return new GraphNodeMap();
    }

    this._isVisiting = true;

    const { outgoingNodes, graphNodeMap } = this;

    const childrenGraphNodeMap = Array.from(outgoingNodes).map((child) => child.getGraphNodeMap());

    this._isVisiting = false;

    return graphNodeMap.concat(...childrenGraphNodeMap);
  }

  /**
   * 将文件添加到 module
   * @param packageName 分包名
   * @param packageGroup 分包分组名
   * @param resourcePath 资源绝对路径
   */
  public addModule(options: {
    packageNames: Set<string>;
    packageGroup: string;
    resourcePath: string;
    nodeType: GraphNodeType;
  }): void {
    const { packageNames, packageGroup, resourcePath, nodeType } = options;
    /** 忽略处理的路径 */
    if (shouldIgnore(this.ignores, resourcePath)) {
      return;
    }

    const dependencyGraphNode = createDependencyGraphNode({
      appRoot: this.appRoot,
      packageNames,
      packageGroup,
      pathname: resourcePath,
      resolver: this.resolver,
      ignores: this.ignores,
      nodeType,
    });

    dependencyGraphNode.build();

    this.outgoingNodes.add(dependencyGraphNode);
    dependencyGraphNode.incomingNodes.add(this);

    this.graphNodeMap.add(dependencyGraphNode);
  }

  /**
   * 添加页面、组件依赖的子组件
   * @param resources
   * @param resolve
   */
  public addOutgoingNodes(resources: string[], resolve = this.resolve): void {
    resources.map((resource) => {
      /** 获取 js 路径 */
      const resourcePath = resolve(resource);

      this.addModule({
        packageNames: this.packageNames,
        packageGroup: this.packageGroup,
        resourcePath,
        nodeType: GraphNodeType.Component,
      });
    });
  }
}

/**
 * 创建依赖树节点
 * @param options IDependencyGraphNode
 * @returns
 */
export const createDependencyGraphNode: CachedFunction<(options: IDependencyGraphNode) => DependencyGraphNode> = (
  options,
) => {
  if (!createDependencyGraphNode.cache) {
    createDependencyGraphNode.cache = {};
  }

  const { cache } = createDependencyGraphNode;
  const { appRoot, packageNames, packageGroup, pathname, resolver, ignores, nodeType } = options;

  const cacheId = `${packageGroup}:${pathname}`;

  let dependencyGraphNode: DependencyGraphNode;

  /** 如果已经有创建过，复用 */
  if (cache[cacheId]) {
    dependencyGraphNode = cache[cacheId];
    packageNames.forEach((packageName) => {
      recursiveAddPackageNames(dependencyGraphNode, packageName);
    });
  } else {
    /** 否则创建新的节点并缓存 */
    dependencyGraphNode = new DependencyGraphNode({
      appRoot,
      packageNames: new Set(packageNames),
      packageGroup,
      pathname,
      resolver,
      ignores,
      nodeType,
    });
    cache[cacheId] = dependencyGraphNode;
  }

  return dependencyGraphNode;
};
