import path from 'path';
import { Compilation, NormalModule } from 'webpack';
import { shouldIgnore } from '../../utils/ignore';
import {
  APP_GROUP_NAME,
  APP_PACKAGE_NAME,
  DEFAULT_ASSETS_MAP_IGNORES,
  INDEPENDENT_PKG_OUTSIDE_DEP_DIR,
} from '../../utils/constant';
import { DependencyTree, DependencyTreeNode } from '../dependencyTree';

export interface IAssetsMapOptions {
  context: string /** app 目录 */;
  publicPath?: string /** 独立分包外部依赖拷贝目录 */;
  ignore?: Array<RegExp> /** 忽略的文件（夹） */;
  dependencyTree: DependencyTree /** 依赖树实例 */;
}

interface ModuleRelationship {
  parents?: Set<string>;
  chunkNames: Set<string>;
  module: NormalModule;
  chunkAssetPathMap?: Map<string, string>;
}

export class AssetsMap {
  /** 静态资源模块依赖表 */
  public assetsRelationship = new Map<string, ModuleRelationship>();

  /** app 目录 */
  public context: string;

  /** 独立分包外部依赖拷贝目录 */
  public publicPath: string;

  /** 忽略的文件 */
  public ignore: Required<IAssetsMapOptions>['ignore'];

  /** 依赖树 */
  public dependencyTree: DependencyTree;

  constructor(options: IAssetsMapOptions) {
    this.context = options.context;
    this.ignore = DEFAULT_ASSETS_MAP_IGNORES.concat(options.ignore || []);
    this.publicPath = options.publicPath || INDEPENDENT_PKG_OUTSIDE_DEP_DIR;
    this.dependencyTree = options.dependencyTree;
  }

  public init(compilation: Compilation) {
    /**
     * 构建父子关联
     */
    compilation.modules.forEach((module) => {
      if (module instanceof NormalModule && !shouldIgnore(this.ignore, module.resource)) {
        const absolutePath = module.resource;
        const { parentsPath } = module.buildInfo;
        const chunks = compilation.chunkGraph.getModuleChunks(module);
        const chunkNames = new Set(chunks.map((chunk) => chunk.name));

        this.assetsRelationship.set(absolutePath, {
          chunkNames,
          parents: parentsPath,
          module,
        });
      }
    });

    /** 构建资源 chunkName 到路径的映射关系 */
    compilation.modules.forEach((module) => {
      if (module instanceof NormalModule && !shouldIgnore(this.ignore, module.resource)) {
        this.setChunkAssetPathMap(module.resource);
      }
    });
  }

  /**
   * 获取资源引用相对路径
   * @param source 当前资源绝对路径
   * @param asset 引用资源绝对路径
   * @param chunkName 当前 chunkName
   */
  public getReferencePath(source: string, asset: string, chunkName: string) {}

  /**
   * 获取当前资源的输出路径
   * @param source 当前资源绝对路径
   * @param chunkName 当前 chunkName
   */
  public getOutputPath(source: string, chunkName: string) {}

  /**
   * 设置静态资源的 chunkName 对应的资源输出路径映射
   * @param request
   */
  private setChunkAssetPathMap(request: string): void {
    const relationship = this.assetsRelationship.get(request);

    if (!relationship) {
      return;
    }

    /** 获取相对 app 文件夹的文件路径 */
    const filename = path.relative(this.context, request);
    /** 查找当前模块的 chunkNames */
    const chunkNames = this.findAssetModuleChunkNames(request);
    const chunkNamePrefixMap = this.getOptimizedAssetPathPrefixes(chunkNames, filename);
    const chunkAssetPathMap = new Map<string, string>();

    chunkNamePrefixMap.forEach((prefix, chunkName) => {
      chunkAssetPathMap.set(chunkName, path.join(prefix, filename));
    });

    relationship.chunkAssetPathMap = chunkAssetPathMap;
  }

  /**
   * 从静态资源模块依赖表获取资源 chunk 信息
   * @param request
   * @returns
   */
  private findAssetModuleChunkNames(request: string): string[] {
    const relationship = this.assetsRelationship.get(request);

    if (!relationship) {
      throw new Error(`assetsRelationship 不存在此依赖：${request}`);
    }

    const { chunkNames, parents } = relationship;

    /** 读取缓存，若无缓存则只有 entry 添加的静态资源存在初始 chunk，结束递归 */
    if (chunkNames.size) {
      return Array.from(chunkNames);
    }

    if (!parents) {
      return [APP_GROUP_NAME];
    }

    /** 递归查找 */
    const result = Array.from(parents).reduce((_chunkNames: string[], parent) => {
      return _chunkNames.concat(this.findAssetModuleChunkNames(parent));
    }, []);

    /** 写入当前资源的 chunkNames 列表以缓存 */
    result.forEach((_chunkName) => chunkNames.add(_chunkName));

    return Array.from(chunkNames);
  }

  /**
   * 通过 chunkName 获取优化后的 {chunkName => 资源路径} 映射
   * @param treeNodes
   * @param filename
   * @returns
   */
  private getOptimizedAssetPathPrefixes(chunkNames: string[], filename: string): Map<string, string> {
    const moduleMaps = this.dependencyTree.getModuleMaps();

    /** chunkName 对应的 dependencyTreeNode 实例列表 */
    const treeNodes = chunkNames
      .map((chunkName) => moduleMaps.get(chunkName))
      .filter((node) => typeof node !== 'undefined') as DependencyTreeNode[];

    /** 依赖引用次数 */
    let useCount = 0;
    /** 未在主包使用 */
    const notUsedInAppPackage = treeNodes.every(({ packageName, independent }) => {
      /** 独立分包不计算使用次数 */
      if (!independent) {
        useCount++;
      }

      return packageName !== APP_PACKAGE_NAME;
    });

    /** 只在一个分包使用 */
    const onlyUsedInOneSubPackage = useCount < 2 && notUsedInAppPackage;
    /** chunkName 和资源路径前缀的映射 */
    const optimizedAssetPathMap = new Map<string, string>();

    treeNodes.forEach(({ chunkName, packageName, packageGroup, independent }) => {
      /** 当只在一个分包中使用了，将其移动到该分包下 */
      if (onlyUsedInOneSubPackage && packageGroup === APP_GROUP_NAME) {
        optimizedAssetPathMap.set(chunkName, path.join(packageName, this.publicPath, filename));
        return;
      }

      /**
       * @thinking
       * 独立分包引的组件的 chunkName 是带了 publicPath 的，组件下的静态资源绝对路径还是在分包外的，仍然要加 publicPath
       * 但是必须和 chunkName 里面的 publicPath 完全一致，否则打包位置会出错
       * 独立分包下引用的静态资源挪进来的话，路径没带 publicPath，也要加
       */

      /** 外部引用移动到分包内的新路径 */
      const referencePath = path.join(packageGroup, this.publicPath, filename);

      /** 只有独立分包下才需要改变依赖输出路径 */
      optimizedAssetPathMap.set(chunkName, independent ? referencePath : filename);
    });

    return optimizedAssetPathMap;
  }
}
