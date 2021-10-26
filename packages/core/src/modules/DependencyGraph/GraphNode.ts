import path from 'path';
import fsx from 'fs-extra';
import globby from 'globby';
import { replaceExt, removeExt, FileResolver } from '@weapp-toolkit/tools';
import { IWeappComponentConfig, IWeappPageConfig } from '@weapp-toolkit/weapp-types';
import { APP_PACKAGE_NAME, PKG_OUTSIDE_DEP_DIRNAME } from '../../utils/constant';
import GraphNodeIndex from './GraphNodeIndex';
import { ChunkInfo, GraphNodeType } from './types';
import GraphNodeFactory from './GraphNodeFactory';
import { container } from './utils';
import { DI_TYPES } from './constant';
import PackageManager, { PackageInfo } from '../PackageManager';

export interface GraphNodeOptions {
  /** app 根绝对路径 */
  appRoot: string;
  /** 分包名 */
  packageNames: Set<string>;
  /** 依赖绝对路径 */
  resourcePath: string;
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
export class GraphNode {
  /** 信号量，标记是否正在遍历，避免循环 */
  private _isVisiting = false;

  /** 依赖文件名 */
  private _basename!: string;

  /** 工厂类 */
  protected graphNodeFactory = container.get<GraphNodeFactory>(DI_TYPES.GraphNodeFactory);

  /** 文件路径解析器 */
  protected resolver = container.get<FileResolver>(DI_TYPES.FileResolver);

  /** 分包管理器 */
  public packageManager = container.get<PackageManager>(DI_TYPES.PackageManager);

  /** 模块路径解析，不带扩展名默认解析 js、ts 文件 */
  public resolve: (resourcePath: string) => string;

  /** app 根路径 */
  public appRoot: string;

  /** 分包名 */
  public packageNames = new Set<string>();

  /** 依赖绝对路径 */
  public resourcePath: string;

  /** 依赖文件夹绝对路径 */
  public context: string;

  /** 节点类型 */
  public nodeType: GraphNodeType;

  /** 父节点 （依赖了该节点的节点） */
  public incomingNodes = new Set<GraphNode>();

  /** 子节点 （该节点依赖的节点） */
  public outgoingNodes = new Set<GraphNode>();

  /** packageName => 输出绝对路径 */
  public outputMap = new Map<string, string>();

  /** chunk 信息 */
  public chunkInfos = new Set<ChunkInfo>();

  constructor(options: GraphNodeOptions) {
    const { appRoot, resourcePath, packageNames, nodeType } = options;
    const context = path.dirname(resourcePath);

    this.appRoot = appRoot;
    this.resourcePath = resourcePath;
    this.context = context;
    this.resolve = this.resolver.resolveDependencySync.bind(null, context);
    this.nodeType = nodeType;

    packageNames.forEach((packageName) => {
      this.packageNames.add(packageName);
    });
  }

  /** 依赖文件名 */
  public get basename(): string {
    return this._basename || (this._basename = path.basename(this.resourcePath));
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

    /** 只有节点是 entry 的情况下才添加其他节点 */
    if (this.isEntryNode()) {
      const jsonPath = resolve(replaceExt(basename, '.json'));
      const json: IWeappPageConfig | IWeappComponentConfig = fsx.readJSONSync(jsonPath);

      this.addEntryNodes(Object.values(json.usingComponents || {}));
      this.addEntryAssetNodes();
    }

    this._isVisiting = false;
  }

  /**
   * 重新扫描 json 依赖，添加同名依赖（wxml、wxs 等）
   */
  public rebuild(): void {
    this.outgoingNodes.clear();

    this.build();
  }

  /**
   * 初始化一些属性
   */
  public init(): void {
    this.computeOutputMapAndChunkInfo();
  }

  /** 判断是否是 entry */
  public isEntryNode(): boolean {
    return [GraphNodeType.App, GraphNodeType.Page, GraphNodeType.Component].includes(this.nodeType);
  }

  /**
   * 添加依赖文件
   * @param resourcePath
   */
  public addNormalAssetNode(resourcePath: string): void {
    this.addNode({
      context: '/',
      reference: resourcePath,
      nodeType: GraphNodeType.NormalAsset,
      initImmediately: true,
    });
  }

  /**
   * 添加 json 配置内的组件
   * @param references
   */
  protected addEntryNodes(references: string[]): void {
    references.forEach((reference) =>
      this.addNode({
        reference,
        nodeType: GraphNodeType.Component,
      }),
    );
  }

  /**
   * 添加同名资源文件 (wxml、wxss 等)
   */
  protected addEntryAssetNodes(): void {
    const assets = globby.sync(replaceExt(this.basename, '.{wxml,json,wxss,css,less,scss,sass,styl,stylus,postcss}'), {
      cwd: this.context,
    });

    assets.forEach((asset) =>
      this.addNode({
        reference: asset,
        nodeType: GraphNodeType.EntryAsset,
      }),
    );
  }

  /**
   * 将文件添加到 module
   * @param packageName 分包名
   * @param packageGroup 分包分组名
   * @param reference 资源引用路径
   */
  protected addNode(options: {
    packageNames?: Set<string>;
    /** 引用依赖的查找范围 */
    context?: string;
    /** 引用依赖的路径 */
    reference: string;
    /** 依赖节点类型 */
    nodeType: GraphNodeType;
    /** 立即初始化 */
    initImmediately?: boolean;
  }): void {
    const { packageNames = this.packageNames, context = this.context, reference, nodeType, initImmediately } = options;

    const graphNode = this.graphNodeFactory.createGraphNode(this, {
      appRoot: this.appRoot,
      context,
      packageNames,
      reference,
      nodeType,
    });

    /** ignore 的依赖不会返回节点 */
    if (!graphNode) {
      return;
    }

    graphNode.build();

    /** 立即初始化 */
    if (initImmediately) {
      graphNode.init();
    }
  }

  /**
   * 计算 packageName 到 输出路径的绝对路径 的映射
   */
  private computeOutputMapAndChunkInfo() {
    const { appRoot, resourcePath, packageNames, packageManager, outputMap, chunkInfos } = this;

    /** 相对 app 根目录的文件路径 */
    const filename = path.relative(appRoot, resourcePath);

    /** 非独立分包引用次数 */
    let referenceCount = 0;
    const packageInfoList: PackageInfo[] = [];

    packageNames.forEach((packageName) => {
      const packageInfo = packageManager.get(packageName);

      if (!packageInfo) {
        return;
      }

      const { independent } = packageInfo;

      /** 独立分包和主包不相干，所以非独立分包才计数 */
      if (!independent) {
        referenceCount++;
      }

      packageInfoList.push(packageInfo);
    });

    /** packageNames 里没有主包，表示该节点没有被主包依赖
     * referenceCount 小于等于 1 表示只有一个分包引用了
     */
    const onlyUsedInOneSubPackage = !packageNames.has(APP_PACKAGE_NAME) && referenceCount <= 1;

    packageInfoList.forEach((packageInfo) => {
      const { name, independent, root } = packageInfo;

      /** 独立分包和仅一个分包引用的情况下 */
      if (independent || onlyUsedInOneSubPackage) {
        /**
         * 当该节点对应的资源文件不在该分包内部时，将其移动到分包内部
         */
        const output = !packageManager.isLocatedInPackage(name, filename)
          ? path.join(root, PKG_OUTSIDE_DEP_DIRNAME, filename)
          : filename;
        const chunkName = removeExt(output);

        /** 存入映射表 */
        outputMap.set(name, path.resolve(appRoot, output));

        /**
         * @description
         * 不在主包的文件，其 chunk group 应该同分包路径
         */

        chunkInfos.add({
          id: chunkName,
          group: root,
          independent,
          packageName: name,
        });
        return;
      }

      /** 直接按原路径存入映射表 */
      const chunkName = removeExt(path.relative(appRoot, resourcePath));
      outputMap.set(name, resourcePath);
      chunkInfos.add({
        id: chunkName,
        group: root,
        independent,
        packageName: name,
      });
    });
  }
}
