import $ from 'lodash';
import path from 'path';
import { Chunk, Compilation, Compiler, Module, NormalModule } from 'webpack';
import { removeExt, shouldIgnore, getAssetType } from '@weapp-toolkit/tools';
import { CustomAssetInfo, PlaceholderMap } from '@weapp-toolkit/weapp-types';
import { DEFAULT_ASSETS_MAP_IGNORES, PKG_OUTSIDE_DEP_DIRNAME } from '../utils/constant';
import { AssetsMap } from '../modules/assetsMap';
import { DependencyGraph } from '../modules/dependencyGraph';
import { isInSubPackage } from '../utils/dependency';

/**
 * DependencyPlugin 初始化选项
 */
export interface IOptimizeChunkPluginOptions {
  /** app 目录 */
  context: string;
  /** 拷贝代码的输出目录 */
  publicPath?: string;
  /** 忽略的文件（夹） */
  ignores?: RegExp[];
  /** 依赖树实例 */
  dependencyGraph: DependencyGraph;
}

/**
 * 处理小程序依赖以及依赖分析
 */
export class OptimizeChunkPlugin {
  static PLUGIN_NAME = 'OptimizeChunkPlugin';

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 独立分包外部依赖拷贝目录 */
  publicPath: string;

  /** 忽略的文件 */
  ignores: Required<IOptimizeChunkPluginOptions>['ignores'];

  /** 静态资源模块依赖表 */
  assetsMap: AssetsMap;

  /** 依赖树 */
  dependencyGraph!: DependencyGraph;

  constructor(options: IOptimizeChunkPluginOptions) {
    this.context = options.context;
    this.dependencyGraph = options.dependencyGraph;
    this.publicPath = options.publicPath || PKG_OUTSIDE_DEP_DIRNAME;
    this.ignores = DEFAULT_ASSETS_MAP_IGNORES.concat(options.ignores || []);

    this.assetsMap = new AssetsMap({
      context: options.context,
      ignores: this.ignores,
      dependencyGraph: options.dependencyGraph,
      publicPath: options.publicPath,
    });
  }

  apply(compiler: Compiler): void {
    compiler.hooks.finishMake.tap(OptimizeChunkPlugin.PLUGIN_NAME, (compilation) => {
      // 处理独立分包引用主包 js 资源的情况
      compilation.hooks.afterOptimizeChunks.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        const cloneChunkCache = new Map();
        const { dependencyGraph } = this;

        compilation.entrypoints.forEach((entryPoint) => {
          const graphNodeMap = dependencyGraph.getGraphNodeMap();
          const { packageGroup, independent } = graphNodeMap.getNodeByChunkName(entryPoint.name || '') || {};
          if (packageGroup && independent) {
            // 对于独立分包的entryPoint，扫描其依赖的所有chunk
            // 如果chunk不在内独立分包内，则拷贝一个新chunk输出在独立分包中
            entryPoint.chunks.forEach((chunk) => {
              if (!isInSubPackage(chunk.name, packageGroup)) {
                // 从主包移动到独立分包的chunk在独立分包内的输出路径
                const clonedChunkName = `${packageGroup}/${PKG_OUTSIDE_DEP_DIRNAME}/${chunk.name}`;

                let clonedChunk = cloneChunkCache.get(clonedChunkName);

                if (!clonedChunk) {
                  // 若输出路径的chunk未被clone过，clone一个chunk
                  clonedChunk = this.cloneChunk(clonedChunkName, chunk, compilation);
                  clonedChunk.runtime = entryPoint.getRuntimeChunk()?.name;
                  cloneChunkCache.set(clonedChunkName, clonedChunk);
                }

                // Merge id name hints
                chunk.idNameHints.forEach((hint) => {
                  clonedChunk.idNameHints.add(hint);
                });

                // 替换掉独立分包entryPoint中原来的chunk
                entryPoint.replaceChunk(chunk, clonedChunk);
                clonedChunk.addGroup(entryPoint);
                chunk.removeGroup(entryPoint);
              }
            });
          }
        });
      });

      /** 处理非 js 资源模块的路径和引用 */
      compilation.hooks.beforeModuleAssets.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        this.assetsMap.init(compilation);
        this.optimizeAssetModules(compilation);
      });

      compilation.hooks.beforeChunkAssets.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        console.info('skr: all assets beforeChunkAssets', Object.keys(compilation.assets));
      });
    });

    compiler.hooks.environment.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
      // 补充一些特殊的splitChunk配置
      const splitChunksConfig = compiler.options.optimization.splitChunks;
      const processedConfig: typeof splitChunksConfig = {
        ...splitChunksConfig,

        // 不做模块合并，维持原来的文件目录结构
        minChunks: 1,
        minSize: 1,
        chunks: (chunk: Chunk) => {
          // 由主包移动到独立分包的资源不参与splitChunk
          const graphNodeMap = this.dependencyGraph.getGraphNodeMap();
          if (
            graphNodeMap.getNodeByChunkName(chunk.name)?.independent &&
            chunk.name.indexOf(PKG_OUTSIDE_DEP_DIRNAME) > -1
          ) {
            return false;
          }
          return true;
        },
        name: (module: Module) => {
          // 按照模块路径输出
          if (module instanceof NormalModule) {
            if (getAssetType(module.resource) === 'js' && !module.isEntryModule()) {
              return removeExt(path.relative(this.context, module.resource));
            }
          }
          return false;
        },
      };
      compiler.options.optimization.splitChunks = processedConfig;
    });
  }

  /**
   * clone一个chunk并添加到compilation中
   * @param name clone获得的chunk的name
   * @param srcChunk 被clone的chunk
   * @param compilation 当前所在的compilation
   * @returns clone得到的新chunk
   */
  cloneChunk(name: string, srcChunk: Chunk, compilation: Compilation) {
    const { chunkGraph } = compilation;

    const clonedChunk = new Chunk(name);
    chunkGraph.getChunkModules(srcChunk).forEach((m) => {
      chunkGraph.connectChunkAndModule(clonedChunk, m);
    });

    clonedChunk.chunkReason = srcChunk.chunkReason;

    compilation.chunks.add(clonedChunk);

    return clonedChunk;
  }

  /** 优化静态资源路径并替换占位符 */
  optimizeAssetModules(compilation: Compilation): void {
    const { assetsMap } = this;

    compilation.modules.forEach((module) => {
      if (module instanceof NormalModule && !shouldIgnore(this.ignores, module.resource)) {
        const absolutePath = module.resource.replace(/\?.*$/, '');
        const { assets, assetsInfo } = module.buildInfo;

        /** 没有资源实体 */
        if (!assets) {
          return;
        }

        const clonedAssets = $.cloneDeep(assets);
        const optimizedAssets: Record<string, any> = {};
        const chunkNames = assetsMap.getChunkNames(absolutePath);

        for (const chunkName of chunkNames) {
          const newFileDirname = path.dirname(assetsMap.getOutputPath(absolutePath, chunkName));

          /** 遍历 module 的 assets */
          for (const assetName in clonedAssets) {
            const filename = path.join(newFileDirname, path.basename(assetName));
            const fileSource = $.cloneDeep(assets[assetName]);
            const fileInfo: CustomAssetInfo = assetsInfo.get(assetName) || {};
            const { placeholderMap } = fileInfo;

            /** 替换占位符 */
            if (placeholderMap?.size) {
              fileSource._value = this.replaceAssetModule(absolutePath, fileSource._value, placeholderMap, chunkName);

              if (fileSource._valueIsBuffer) {
                fileSource._value = Buffer.from(fileSource._value);
                fileSource._valueAsBuffer = fileSource._value;
              } else {
                fileSource._valueAsString = fileSource._value;
              }
            }

            /**
             * cdn-loader 处理后的资源不能再修改位置
             */
            optimizedAssets[fileInfo.keepName ? assetName : filename] = fileSource;
          }
        }

        module.buildInfo.assets = optimizedAssets;
      }
    });
  }

  /** 替换静态资源占位符 */
  replaceAssetModule(
    source: string,
    sourceCode: string | Buffer,
    placeholderMap: PlaceholderMap,
    chunkName: string,
  ): string {
    let code = sourceCode.toString();

    placeholderMap.forEach(({ reference, referenceDir, referenceType, shouldRemoveExt }, placeholder) => {
      const referenceRelativePath = this.assetsMap.getReferencePath(source, reference, chunkName);
      let relativePath = referenceRelativePath;

      if (referenceType === 'dir' && referenceDir) {
        const filename = path.relative(referenceDir, reference);
        /** 获取文件夹的相对路径 */
        relativePath = path.join(referenceRelativePath.replace(filename, ''));
        /** 去掉尾部的斜线 */
        relativePath = relativePath.replace(/\/$/, '');
      }
      code = code.replace(placeholder, shouldRemoveExt ? removeExt(relativePath) : relativePath);
    });

    return code;
  }
}
