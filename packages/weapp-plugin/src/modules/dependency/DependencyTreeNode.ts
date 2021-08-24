import path from 'path';
import fsx from 'fs-extra';
import globby from 'globby';
import { replaceExt, Resolver } from '../../utils/resolver';
import { IWeappComponentConfig, IWeappPageConfig } from '../../../../weapp-types';

/**
 * 依赖树资源类型定义
 */
export type DependencyTreeAssetsType = 'json' | 'js' | 'css' | 'wxml' | 'wxs' | 'other';

export interface IDependencyTreeNode {
  pathname: string /** 依赖绝对路径 */;
  resolver: Resolver /** 模块路径解析工具 */;
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
  private nodeType!: DependencyTreeAssetsType;

  /** 依赖文件名 */
  private nodeBasename!: string;

  /** 模块路径解析工具 */
  public resolver: Resolver;

  /** 模块路径解析，不带扩展名默认解析 js、ts 文件 */
  public resolve: (pathname: string) => string;

  /** 依赖绝对路径 */
  public pathname: string;

  /** 依赖文件夹绝对路径 */
  public context: string;

  /** 依赖资源文件：wxml、css、wxs、png 等 */
  public assets = new Set<DependencyTreeNode>();

  /** 子依赖 */
  public children = new Set<DependencyTreeNode>();

  public get type(): DependencyTreeAssetsType {
    if (!this.nodeType) {
      this.nodeType = this.getNodeType();
    }
    return this.nodeType;
  }

  public get basename(): string {
    if (!this.nodeBasename) {
      this.nodeBasename = path.basename(this.pathname);
    }
    return this.nodeBasename;
  }

  constructor(options: IDependencyTreeNode) {
    const { pathname, resolver } = options;
    const context = path.dirname(pathname);

    this.pathname = pathname;
    this.context = context;
    this.resolver = resolver;
    this.resolve = resolver.resolveDependencySync.bind(null, context);
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
  public getChildrenRecursive(): string[] {
    const { pathname, children } = this;

    const selfDependency = this.isAssets() ? [] : [pathname];

    /** 获取 children js */
    const childrenDependencies = Array.from(children).reduce((deps: string[], child) => {
      return deps.concat(child.getChildrenRecursive());
    }, []);

    return selfDependency.concat(childrenDependencies);
  }

  /** 递归所有子依赖的资源文件 */
  public getAssetsRecursive(): string[] {
    const { pathname, assets, children } = this;

    const selfDependency = this.isAssets() ? [pathname] : [];

    /** 获取自身 assets */
    const assetsDependencies = Array.from(assets).reduce((deps: string[], asset) => {
      return deps.concat(asset.getAssetsRecursive());
    }, []);

    /** 获取 children assets */
    const childrenAssetsDependencies = Array.from(children).reduce((deps: string[], child) => {
      return deps.concat(child.getAssetsRecursive());
    }, []);

    return selfDependency.concat(assetsDependencies, childrenAssetsDependencies);
  }

  /**
   * 获取依赖类型
   * @returns
   */
  private getNodeType(): DependencyTreeAssetsType {
    const ext = path.extname(this.pathname);

    switch (ext) {
      case '.js':
      case '.ts':
        return 'js';
      case '.json':
        return 'json';
      case '.wxml':
        return 'wxml';
      case '.wxs':
        return 'wxs';
      case '.css':
      case '.less':
      case '.scss':
      case '.sass':
      case '.styl':
      case '.stylus':
        return 'css';
      default:
        return 'other';
    }
  }

  /**
   * 当前节点是否是 assets
   */
  private isAssets(): boolean {
    return this.type !== 'js';
  }

  /**
   * 添加页面、组件依赖
   * @param chunkName
   * @param resources
   * @param resolve
   */
  private addAllChildren(resources: string[], resolve = this.resolve) {
    resources.map((resource) => {
      /** 获取 js 路径 */
      const resourcePath = resolve(resource);
      const dependencyTreeNode = createDependencyTreeNode({
        pathname: resourcePath,
        resolver: this.resolver,
      });
      dependencyTreeNode.build();

      /** 添加到 children */
      this.appendChild(dependencyTreeNode);
    });
  }

  /**
   * 添加所有同名资源文件，如 wxml、wxs
   */
  private addAllAssets() {
    const { basename, context, resolve } = this;

    const assets = globby.sync(replaceExt(basename, '.*'), {
      cwd: context,
      ignore: ['*.{js,ts,wxs}'],
    });

    assets.map((resource) => {
      /** 获取绝对路径 */
      const resourcePath = resolve(resource);

      const dependencyTreeNode = createDependencyTreeNode({
        pathname: resourcePath,
        resolver: this.resolver,
      });
      dependencyTreeNode.build();

      /** 添加到 assets */
      this.appendAsset(dependencyTreeNode);
    });
  }

  private appendChild(child: DependencyTreeNode): void {
    this.children.add(child);
  }

  private appendAsset(asset: DependencyTreeNode): void {
    this.assets.add(asset);
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
  const { pathname, resolver } = options;

  /** 如果已经有创建过，复用 */
  if (cache[pathname]) {
    return cache[pathname];
  }

  /** 否则创建新的节点并缓存 */
  const dependencyTreeNode = new DependencyTreeNode({
    pathname,
    resolver,
  });
  cache[pathname] = dependencyTreeNode;
  return dependencyTreeNode;
};
