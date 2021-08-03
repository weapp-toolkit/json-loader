/**
 * 依赖树资源类型定义
 */
export type DependencyTreeAssetsType = 'json' | 'js' | 'css' | 'wxml' | 'wxs' | 'image';

/**
 * 依赖树资源定义
 */
export interface IDependencyTreeAssets {
  pathname: string;
  type: DependencyTreeAssetsType;
}

/**
 * 依赖树初始化选项
 */
export interface IDependencyTreeOptions {
  context: string /** base 文件夹 */;
  entry: string /** 入口文件 */;
}

/**
 * 依赖树 chunk 定义
 */
export interface IDependencyTreeChunk {
  chunkName: string; /** chunk 名 */
  mainDependencies: string[];
  assetsDependencies: string[];
  dependencyTree: DependencyTreeNode[];
}

interface IDependencyTreeNode {
  pathname: string /** 依赖绝对路径 */;
}

/** 依赖树节点 */
class DependencyTreeNode {
  public pathname: string; /** 依赖绝对路径 */

  public assets: IDependencyTreeAssets[] = []; /** 依赖资源文件：wxml、css、wxs、png 等 */

  public children: DependencyTreeNode[] = []; /** 子依赖 */

  constructor(options: IDependencyTreeNode) {
    this.pathname = options.pathname;
  }
}

/** 依赖树 */
export class DependencyTree {
  public chunks: IDependencyTreeChunk[] = [];

  constructor(options: IDependencyTreeOptions) {}
}
