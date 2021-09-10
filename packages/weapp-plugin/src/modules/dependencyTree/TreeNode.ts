import path from 'path';
import fsx from 'fs-extra';
import globby from 'globby';
import { replaceExt, Resolver, getAssetType, AssetType, removeExt } from '@weapp-toolkit/core';
import { IWeappComponentConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';
import { APP_CHUNK_NAME } from '../../utils/constant';

export interface IDependencyTreeNode {
  appRoot: string /** app 根绝对路径 */;
  chunkName: string /** 区块名（和 webpack 区块含义不同，这里表示主包和独立分包划分） */;
  pathname: string /** 依赖绝对路径 */;
  resolver: Resolver /** 模块路径解析工具 */;
  parentPathname?: string /** 父节点依赖绝对路径 */;
}

/** 带 cache 属性的 function，用于局部缓存，避免使用全局变量 */
type CachedFunction<T extends (...args: any[]) => any> = T & {
  cache?: Record<string, DependencyTreeNode>;
};

/** 依赖树节点
 * 可获取依赖的所有依赖
 */
export class DependencyTreeNode {
  /** 依赖类型 */
  private _type!: AssetType;

  /** 依赖文件名 */
  private _basename!: string;

  /** 模块名（跨分包时，同一个文件的模块名将会不同） */
  private _moduleName!: string;

  /** 模块路径解析工具 */
  public resolver: Resolver;

  /** 模块路径解析，不带扩展名默认解析 js、ts 文件 */
  public resolve: (pathname: string) => string;

  /** app 根路径 */
  public appRoot: string;

  /** 区块名 */
  public chunkName: string;

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
    const { appRoot, pathname, resolver, parentPathname, chunkName } = options;
    const context = path.dirname(pathname);

    this.appRoot = appRoot;
    this.chunkName = chunkName;
    this.pathname = pathname;
    this.context = context;
    this.parentPathname = parentPathname;
    this.resolver = resolver;
    this.resolve = resolver.resolveDependencySync.bind(null, context);
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

  /** 模块名，用于生成 entry（跨分包时，同一个文件的模块名将会不同） */
  public get moduleName(): string {
    const { appRoot, chunkName, pathname } = this;
    if (!this._moduleName) {
      const relativePath = path.relative(appRoot, removeExt(pathname));

      if (chunkName === APP_CHUNK_NAME) {
        this._moduleName = relativePath;
      } else {
        /** 如果不是主包依赖，调整其模块到分包下 */
        this._moduleName = relativePath.startsWith(chunkName) ? relativePath : path.join(chunkName, relativePath);
      }
    }

    return this._moduleName;
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
  public getChildrenRecursive(): DependencyTreeNode[] {
    const { modules } = this;

    /** 获取 children js */
    const childrenDependencies = Array.from(modules).reduce((deps: DependencyTreeNode[], child) => {
      return deps.concat(child.getChildrenRecursive());
    }, []);

    return [this as DependencyTreeNode].concat(childrenDependencies);
  }

  /**
   * 当前节点是否是 assets
   */
  public isAssets(): boolean {
    return this.type !== 'js';
  }

  /**
   * 将文件添加到 module
   * @param chunkName chunk 名
   * @param resourcePath 资源绝对路径
   */
  public addModule(chunkName: string, resourcePath: string): void {
    const dependencyTreeNode = createDependencyTreeNode({
      appRoot: this.appRoot,
      chunkName,
      pathname: resourcePath,
      resolver: this.resolver,
    });
    dependencyTreeNode.build();

    this.modules.add(dependencyTreeNode);
    this.modulesMap.set(dependencyTreeNode.moduleName, dependencyTreeNode);
  }

  /**
   * 添加页面、组件依赖
   * @param chunkName
   * @param resources
   * @param resolve
   */
  public addAllChildren(resources: string[], resolve = this.resolve): void {
    const { chunkName } = this;

    resources.map((resource) => {
      /** 获取 js 路径 */
      const resourcePath = resolve(resource);

      this.addModule(chunkName, resourcePath);
    });
  }

  /**
   * 添加所有同名资源文件，如 wxml、wxs
   */
  public addAllAssets(): void {
    const { chunkName, basename, context, resolve } = this;

    const assets = globby.sync(replaceExt(basename, '.*'), {
      cwd: context,
      ignore: ['*.{js,ts,wxs}'],
    });

    assets.map((resource) => {
      /** 获取绝对路径 */
      const resourcePath = resolve(resource);

      this.addModule(chunkName, resourcePath);
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
  const { appRoot, chunkName, pathname, resolver } = options;

  const cacheId = chunkName + pathname;

  /** 如果已经有创建过，复用 */
  if (cache[cacheId]) {
    return cache[cacheId];
  }

  /** 否则创建新的节点并缓存 */
  const dependencyTreeNode = new DependencyTreeNode({
    appRoot,
    chunkName,
    pathname,
    resolver,
  });
  cache[cacheId] = dependencyTreeNode;
  return dependencyTreeNode;
};
