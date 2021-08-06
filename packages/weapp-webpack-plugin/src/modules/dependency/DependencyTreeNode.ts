import path from 'path';

/**
 * 依赖树资源类型定义
 */
export type DependencyTreeAssetsType = 'json' | 'js' | 'css' | 'wxml' | 'wxs' | 'other';

export interface IDependencyTreeNode {
  pathname: string /** 依赖绝对路径 */;
}

/** 带 cache 属性的 function，用于局部缓存，避免使用全局变量 */
interface CachedFunction extends Function {
  cache?: Record<string, DependencyTreeNode>;
}

/** 依赖树节点 */
export class DependencyTreeNode {
  /** 依赖类型 */
  private nodeType!: DependencyTreeAssetsType;

  /** 依赖绝对路径 */
  public pathname: string;

  /** 依赖资源文件：wxml、css、wxs、png 等 */
  public assets = new Set<DependencyTreeNode>();

  /** 子依赖 */
  public children = new Set<DependencyTreeNode>();

  constructor(options: IDependencyTreeNode) {
    this.pathname = options.pathname;
  }

  public get type(): DependencyTreeAssetsType {
    if (!this.nodeType) {
      this.nodeType = this.getNodeType();
    }
    return this.nodeType;
  }

  public appendChild(child: DependencyTreeNode): void {
    this.children.add(child);
  }

  public appendAsset(asset: DependencyTreeNode): void {
    this.assets.add(asset);
  }

  public getChildrenRecursive(): string[] {
    return [];
  }

  public getAssetsRecursive(): string[] {
    return [];
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
}

/**
 * 创建依赖树节点
 * @param options IDependencyTreeNode
 * @returns
 */
export const createDependencyTreeNode: CachedFunction = (options: IDependencyTreeNode): DependencyTreeNode => {
  if (!createDependencyTreeNode.cache) {
    createDependencyTreeNode.cache = {};
  }

  const { cache } = createDependencyTreeNode;
  const { pathname } = options;

  /** 如果已经有创建过，复用 */
  if (cache[pathname]) {
    return cache[pathname];
  }

  /** 否则创建新的节点并缓存 */
  const dependencyTreeNode = new DependencyTreeNode({
    pathname,
  });
  cache[pathname] = dependencyTreeNode;
  return dependencyTreeNode;
};
