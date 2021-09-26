import $ from 'lodash';
import path from 'path';
import { Chunk, Compilation, Compiler, Module, NormalModule } from 'webpack';
import { removeExt } from '@weapp-toolkit/core';
import { CustomAssetInfo, PlaceholderMap } from '@weapp-toolkit/weapp-types';
import { INDEPENDENT_PKG_OUTSIDE_DEP_DIR } from '../utils/constant';
import { shouldIgnore } from '../utils/ignore';
import { AssetsMap } from '../modules/assetsMap';
import { DependencyTree } from '../modules/dependencyTree';
// import { SplitChunksPlugin } from 'webpack';

/**
 * DependencyPlugin 初始化选项
 */
export interface IOptimizeChunkPluginOptions {
  /** app 目录 */
  context: string;
  /** 拷贝代码的输出目录 */
  publicPath?: string;
  /** 忽略的文件（夹） */
  ignore?: Array<RegExp>;
  /** 依赖树实例 */
  dependencyTree: DependencyTree;
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
  ignore: Required<IOptimizeChunkPluginOptions>['ignore'];

  /** 静态资源模块依赖表 */
  assetsMap: AssetsMap;

  /** 依赖树 */
  dependencyTree!: DependencyTree;

  constructor(options: IOptimizeChunkPluginOptions) {
    this.context = options.context;
    this.dependencyTree = options.dependencyTree;
    this.publicPath = options.publicPath || INDEPENDENT_PKG_OUTSIDE_DEP_DIR;
    this.ignore = [/.(js|ts)x?$/].concat(options.ignore || []);

    this.assetsMap = new AssetsMap({
      context: options.context,
      ignore: options.ignore,
      dependencyTree: options.dependencyTree,
      publicPath: options.publicPath,
    });
  }

  apply(compiler: Compiler): void {
    compiler.hooks.finishMake.tap(OptimizeChunkPlugin.PLUGIN_NAME, (compilation) => {
      compilation.hooks.afterOptimizeChunks.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        const cloneChunkCache = new Map();
        const { dependencyTree } = this;
        compilation.entrypoints.forEach((entryPoint) => {
          const moduleMaps = dependencyTree.getModuleMaps();
          const { packageGroup, independent } = moduleMaps.get(entryPoint.name || '') || {};
          if (packageGroup && independent) {
            // 如果是独立分包！
            const { chunkGraph } = compilation;
            entryPoint.chunks.forEach((chunk) => {
              // TODO: 更合理的方式判断 splitChunk
              if (chunk.chunkReason && chunk.chunkReason.indexOf('split chunk') > -1) {
                const clonedChunkName = `${packageGroup}/${INDEPENDENT_PKG_OUTSIDE_DEP_DIR}/${chunk.name}`;
                let clonedChunk = cloneChunkCache.get(clonedChunkName);

                if (!clonedChunk) {
                  clonedChunk = this.cloneChunk(clonedChunkName, chunk, compilation);
                  cloneChunkCache.set(clonedChunkName, clonedChunk);
                }

                // Merge id name hints
                chunk.idNameHints.forEach((hint) => {
                  clonedChunk.idNameHints.add(hint);
                });

                const chunkEntryModules = Array.from(
                  chunkGraph.getChunkEntryModulesWithChunkGroupIterable(entryPoint.getEntrypointChunk()),
                );
                for (const [module, chunkGroup] of chunkEntryModules) {
                  if (chunkGroup === entryPoint) {
                    chunkGraph.disconnectChunkAndEntryModule(chunk, module);
                    chunkGraph.connectChunkAndEntryModule(clonedChunk, module, entryPoint);
                  }
                }

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
      const splitChunksConfig = compiler.options.optimization.splitChunks;
      const processedConfig: typeof splitChunksConfig = {
        ...splitChunksConfig,
        minChunks: 1,
        minSize: 1,
        chunks(chunk: Chunk) {
          // 由主包移动到独立分宝的资源不参与splitChunk
          if (chunk.name.indexOf(INDEPENDENT_PKG_OUTSIDE_DEP_DIR) > -1) {
            return false;
          }
          return true;
        },
        name: (module: Module, chunks: Chunk[], cacheGroupKey: string) => {
          // debugger;
          if (module instanceof NormalModule) {
            if (path.extname(module.resource) === '.js' && !module.isEntryModule()) {
              // debugger;
              return removeExt(path.relative(this.context, module.resource));
            }
          }
          // TODO: 普通分包的放普通分包里
          // const moduleFileName = module
          //   .identifier()
          //   .split('/')
          //   .reduceRight((item) => item);
          // const allChunksNames = chunks.map((item) => item.name).join('~');
          // return `${allChunksNames}-${moduleFileName}`;
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

    clonedChunk.runtime = srcChunk.runtime;
    clonedChunk.chunkReason = srcChunk.chunkReason;

    compilation.chunks.add(clonedChunk);

    return clonedChunk;
  }

  /** 优化静态资源路径并替换占位符 */
  optimizeAssetModules(compilation: Compilation): void {
    const { assetsMap } = this;

    compilation.modules.forEach((module) => {
      if (module instanceof NormalModule && !shouldIgnore(this.ignore, module.resource)) {
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

        // console.info('skr: optimizeAssetModules', { resource, chunkNames, assets, assetsInfo, optimizedAssets });

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

    placeholderMap.forEach(({ reference, shouldRemoveExt }, placeholder) => {
      const referenceRelativePath = this.assetsMap.getReferencePath(source, reference, chunkName);
      code = code.replace(placeholder, shouldRemoveExt ? removeExt(referenceRelativePath) : referenceRelativePath);
    });

    return code;
  }
}
