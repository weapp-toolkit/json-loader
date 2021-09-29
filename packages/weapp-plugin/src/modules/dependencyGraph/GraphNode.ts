import path from 'path';
import fsx from 'fs-extra';
import globby from 'globby';
import { replaceExt, Resolver, getAssetType, AssetType, removeExt } from '@weapp-toolkit/core';
import { IWeappComponentConfig, IWeappPageConfig, CachedFunction } from '@weapp-toolkit/weapp-types';
import { APP_GROUP_NAME, APP_PACKAGE_NAME, PKG_OUTSIDE_DEP_DIRNAME } from '../../utils/constant';
import { shouldIgnore } from '../../utils/ignore';

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
  /** 父节点依赖绝对路径 */
  parentPathname?: string;
  /** 节点类型 */
  nodeType: GraphNodeType;
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
  /** 依赖类型 */
  private _assetType!: AssetType;

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

  /** 父节点依赖绝对路径 */
  public parentPathname?: string;

  /** 父模块 （依赖了该节点的模块） */
  public incomingModules = new Set<DependencyGraphNode>();

  /** 子模块 （该节点依赖的模块） */
  public outgoingModules = new Set<DependencyGraphNode>();

  public modulesMap = new Map<string, DependencyGraphNode>();

  public nodeType: GraphNodeType;

  constructor(options: IDependencyGraphNode) {
    const { appRoot, pathname, resolver, ignores, parentPathname, packageNames, packageGroup, nodeType } = options;
    const context = path.dirname(pathname);

    this.appRoot = appRoot;
    this.packageGroup = packageGroup;
    this.pathname = pathname;
    this.context = context;
    this.parentPathname = parentPathname;
    this.resolver = resolver;
    this.resolve = resolver.resolveDependencySync.bind(null, context);
    this.ignores = ignores;
    this.nodeType = nodeType;
    packageNames.forEach((packageName) => {
      this.packageNames.add(packageName);
    });
  }

  /** 依赖类型 */
  public get type(): AssetType {
    if (!this._assetType) {
      this._assetType = getAssetType(this.pathname);
    }
    return this._assetType;
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
            packageName !== APP_PACKAGE_NAME && !relativePath.startsWith(packageName)
              ? path.join(packageName, PKG_OUTSIDE_DEP_DIRNAME, relativePath)
              : relativePath;
        } else {
          this._chunkName = relativePath;
        }
      } else {
        /** 如果不是主包分组的依赖，调整其模块到独立分包下 */
        this._chunkName = relativePath.startsWith(packageGroup)
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
    const { type, resolve, basename } = this;

    /** js 为入口文件，只有是 js 时才处理依赖 */
    if (type === 'js') {
      const jsonPath = resolve(replaceExt(basename, '.json'));
      const json: IWeappPageConfig | IWeappComponentConfig = fsx.readJSONSync(jsonPath);

      this.addAllChildComponents(Object.values(json.usingComponents || {}));
      this.addAllAssets();
    }
  }

  /** 递归所有的子依赖 */
  public getModules(): DependencyGraphNode[] {
    const { outgoingModules: modules } = this;

    // TODO: 循环依赖问题？
    /** 获取 children js */
    const childrenDependencies = Array.from(modules).reduce((deps: DependencyGraphNode[], child) => {
      return deps.concat(child.getModules());
    }, []);

    return [this as DependencyGraphNode].concat(childrenDependencies);
  }

  /** 递归所有的子依赖 chunk 映射 */
  public getModuleMaps(): Map<string, DependencyGraphNode> {
    const { outgoingModules: modules, modulesMap } = this;

    const combinedModulesMap = new Map<string, DependencyGraphNode>(modulesMap);

    Array.from(modules).forEach((child) => {
      const childModulesMap = child.getModuleMaps();

      childModulesMap.forEach((value, key) => {
        combinedModulesMap.set(key, value);
      });
    });

    return combinedModulesMap;
  }

  /**
   * 当前节点是否是 assets
   */
  public isAssets(): boolean {
    return this.type !== 'js';
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

    this.outgoingModules.add(dependencyGraphNode);
    dependencyGraphNode.incomingModules.add(this);

    if (!this.isAssets()) {
      this.modulesMap.set(dependencyGraphNode.chunkName, dependencyGraphNode);
    }
  }

  /**
   * 添加当前分包下的子模块
   * @param resourcePath
   * @param nodeType
   */
  public addCurrentPackageModule(resourcePath: string, nodeType: GraphNodeType) {
    this.addModule({
      packageNames: this.packageNames,
      packageGroup: this.packageGroup,
      resourcePath,
      nodeType,
    });
  }

  /**
   * 添加页面、组件依赖的子组件
   * @param resources
   * @param resolve
   */
  public addAllChildComponents(resources: string[], resolve = this.resolve): void {
    resources.map((resource) => {
      /** 获取 js 路径 */
      const resourcePath = resolve(resource);

      this.addCurrentPackageModule(resourcePath, GraphNodeType.Component);
    });
  }

  /**
   * 添加页面/组件的所有同名资源文件，如 wxml
   */
  public addAllAssets(): void {
    const { basename, context, resolve } = this;

    const assets = globby.sync(replaceExt(basename, '.*'), {
      cwd: context,
      ignore: ['*.{js,ts,wxs}'],
    });

    assets.map((resource) => {
      /** 获取绝对路径 */
      const resourcePath = resolve(resource);

      this.addCurrentPackageModule(resourcePath, this.nodeType);
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

function recursiveAddPackageNames(node: DependencyGraphNode, packageName: string) {
  if (!node.packageNames.has(packageName)) {
    node.packageNames.add(packageName);
    node.outgoingModules.forEach((outgoingModule) => {
      recursiveAddPackageNames(outgoingModule, packageName);
    });
  }
}
