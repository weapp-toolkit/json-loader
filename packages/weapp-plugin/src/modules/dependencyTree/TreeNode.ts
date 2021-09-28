import path from 'path';
import fsx from 'fs-extra';
import globby from 'globby';
import { replaceExt, Resolver, getAssetType, AssetType, removeExt } from '@weapp-toolkit/core';
import { IWeappComponentConfig, IWeappPageConfig, CachedFunction } from '@weapp-toolkit/weapp-types';
import { APP_GROUP_NAME, PKG_OUTSIDE_DEP_DIRNAME } from '../../utils/constant';
import { shouldIgnore } from '../../utils/ignore';

export interface IDependencyTreeNode {
  /** app 根绝对路径 */
  appRoot: string;
  /** 分包名 */
  packageName: string;
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
export class DependencyTreeNode {
  /** 依赖类型 */
  private _type!: AssetType;

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
  public packageName: string;

  /** 分包分组名 */
  public packageGroup: string;

  /** 依赖绝对路径 */
  public pathname: string;

  /** 依赖文件夹绝对路径 */
  public context: string;

  /** 父节点依赖绝对路径 */
  public parentPathname?: string;

  /** 子依赖 */
  public modules = new Set<DependencyTreeNode>();

  public modulesMap = new Map<string, DependencyTreeNode>();

  constructor(options: IDependencyTreeNode) {
    const { appRoot, pathname, resolver, ignores, parentPathname, packageName, packageGroup } = options;
    const context = path.dirname(pathname);

    this.appRoot = appRoot;
    this.packageName = packageName;
    this.packageGroup = packageGroup;
    this.pathname = pathname;
    this.context = context;
    this.parentPathname = parentPathname;
    this.resolver = resolver;
    this.resolve = resolver.resolveDependencySync.bind(null, context);
    this.ignores = ignores;
  }

  /** 依赖类型 */
  public get type(): AssetType {
    if (!this._type) {
      this._type = getAssetType(this.pathname);
    }
    return this._type;
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
    const { appRoot, packageGroup, pathname } = this;
    if (!this._chunkName) {
      const relativePath = path.relative(appRoot, removeExt(pathname));

      if (packageGroup === APP_GROUP_NAME) {
        this._chunkName = relativePath;
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

      this.addAllChildren(Object.values(json.usingComponents || {}));
      this.addAllAssets();
    }
  }

  /** 递归所有的子依赖 */
  public getModules(): DependencyTreeNode[] {
    const { modules } = this;

    /** 获取 children js */
    const childrenDependencies = Array.from(modules).reduce((deps: DependencyTreeNode[], child) => {
      return deps.concat(child.getModules());
    }, []);

    return [this as DependencyTreeNode].concat(childrenDependencies);
  }

  /** 递归所有的子依赖 chunk 映射 */
  public getModuleMaps(): Map<string, DependencyTreeNode> {
    const { modules, modulesMap } = this;

    const combinedModulesMap = new Map<string, DependencyTreeNode>(modulesMap);

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
  public addModule(packageName: string, packageGroup: string, resourcePath: string): void {
    /** 忽略处理的路径 */
    if (shouldIgnore(this.ignores, resourcePath)) {
      return;
    }

    const dependencyTreeNode = createDependencyTreeNode({
      appRoot: this.appRoot,
      packageName,
      packageGroup,
      pathname: resourcePath,
      resolver: this.resolver,
      ignores: this.ignores,
    });
    dependencyTreeNode.build();

    this.modules.add(dependencyTreeNode);

    if (!this.isAssets()) {
      this.modulesMap.set(dependencyTreeNode.chunkName, dependencyTreeNode);
    }
  }

  /**
   * 添加页面、组件依赖
   * @param resources
   * @param resolve
   */
  public addAllChildren(resources: string[], resolve = this.resolve): void {
    const { packageName, packageGroup } = this;

    resources.map((resource) => {
      /** 获取 js 路径 */
      const resourcePath = resolve(resource);

      this.addModule(packageName, packageGroup, resourcePath);
    });
  }

  /**
   * 添加所有同名资源文件，如 wxml
   */
  public addAllAssets(): void {
    const { packageName, packageGroup, basename, context, resolve } = this;

    const assets = globby.sync(replaceExt(basename, '.*'), {
      cwd: context,
      ignore: ['*.{js,ts,wxs}'],
    });

    assets.map((resource) => {
      /** 获取绝对路径 */
      const resourcePath = resolve(resource);

      this.addModule(packageName, packageGroup, resourcePath);
    });
  }
}

/**
 * 创建依赖树节点
 * @param options IDependencyTreeNode
 * @returns
 */
export const createDependencyTreeNode: CachedFunction<(options: IDependencyTreeNode) => DependencyTreeNode> = (
  options,
) => {
  if (!createDependencyTreeNode.cache) {
    createDependencyTreeNode.cache = {};
  }

  const { cache } = createDependencyTreeNode;
  const { appRoot, packageName, packageGroup, pathname, resolver, ignores } = options;

  const cacheId = `${packageGroup}:${pathname}`;

  /** 如果已经有创建过，复用 */
  if (cache[cacheId]) {
    return cache[cacheId];
  }

  /** 否则创建新的节点并缓存 */
  const dependencyTreeNode = new DependencyTreeNode({
    appRoot,
    packageName,
    packageGroup,
    pathname,
    resolver,
    ignores,
  });
  cache[cacheId] = dependencyTreeNode;
  return dependencyTreeNode;
};
