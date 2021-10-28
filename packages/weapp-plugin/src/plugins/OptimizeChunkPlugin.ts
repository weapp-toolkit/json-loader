import $ from 'lodash';
import path from 'path';
import { Chunk, Compilation, Compiler, Module, NormalModule } from 'webpack';
import { removeExt, shouldIgnore, getAssetType } from '@weapp-toolkit/tools';
import { CustomAssetInfo, PlaceholderMap } from '@weapp-toolkit/weapp-types';
import { DependencyGraph, PKG_OUTSIDE_DEP_DIRNAME } from '@weapp-toolkit/core';

const DEFAULT_IGNORES = [/\.(jsx?|tsx?)$/];

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

  /** 依赖树 */
  dependencyGraph!: DependencyGraph;

  constructor(options: IOptimizeChunkPluginOptions) {
    this.context = options.context;
    this.dependencyGraph = options.dependencyGraph;
    this.publicPath = options.publicPath || PKG_OUTSIDE_DEP_DIRNAME;
    this.ignores = DEFAULT_IGNORES.concat(options.ignores || []);
  }

  apply(compiler: Compiler): void {
    compiler.hooks.finishMake.tap(OptimizeChunkPlugin.PLUGIN_NAME, (compilation) => {
      // 处理独立分包引用主包 js 资源的情况
      compilation.hooks.afterOptimizeChunks.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        const cloneChunkCache = new Map();
        const { dependencyGraph } = this;

        compilation.entrypoints.forEach((entryPoint) => {
          const { graphNodeIndex } = dependencyGraph;
          const { independent, packageName } = graphNodeIndex.chunks.get(entryPoint.name || '') || {};
          if (independent && packageName) {
            /**
             * 对于独立分包的 entryPoint，扫描其依赖的所有 chunk
             * 如果 chunk 不在内独立分包内，则拷贝一个新 chunk 输出在独立分包中
             */
            entryPoint.chunks.forEach((chunk) => {
              if (!dependencyGraph.packageManager.isLocatedInPackage(packageName, chunk.name)) {
                // 从主包移动到独立分包的 chunk 在独立分包内的输出路径
                const clonedChunkName = `${packageName}/${PKG_OUTSIDE_DEP_DIRNAME}/${chunk.name}`;

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
        this.optimizeAssetModules(compilation);
      });

      compilation.hooks.beforeChunkAssets.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        console.info('skr: all assets beforeChunkAssets', Object.keys(compilation.assets));
      });
    });

    compiler.hooks.environment.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
      const { graphNodeIndex } = this.dependencyGraph;
      /** 补充一些特殊的 splitChunk 配置 */
      const splitChunksConfig = compiler.options.optimization.splitChunks;
      const processedConfig: typeof splitChunksConfig = {
        ...splitChunksConfig,

        /** 不做模块合并，维持原来的文件目录结构 */
        minChunks: 1,
        minSize: 1,
        chunks: (chunk: Chunk) => {
          /** 由主包移动到独立分包的资源不参与 splitChunk */
          if (graphNodeIndex.chunks.get(chunk.name)?.independent && chunk.name.indexOf(PKG_OUTSIDE_DEP_DIRNAME) > -1) {
            return false;
          }
          return true;
        },
        name: (module: Module) => {
          // 按照模块路径输出
          if (module instanceof NormalModule) {
            if (!graphNodeIndex.getNodeByRequest(module.resource)?.isEntryNode()) {
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
  cloneChunk(name: string, srcChunk: Chunk, compilation: Compilation): Chunk {
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
    const { dependencyGraph } = this;
    const { graphUtil, graphNodeIndex } = dependencyGraph;

    compilation.modules.forEach((module) => {
      if (module instanceof NormalModule && !shouldIgnore(this.ignores, module.resource)) {
        const absolutePath = module.resource.replace(/\?.*$/, '');
        const { assets, assetsInfo } = module.buildInfo;
        const graphNode = graphNodeIndex.getNodeByRequest(module.resource);

        /** 没有资源实体 */
        if (!assets || !graphNode) {
          return;
        }

        const clonedAssets = $.cloneDeep(assets);
        const optimizedAssets: Record<string, any> = {};
        const { chunkInfos } = graphNode;

        chunkInfos.forEach(({ packageName }) => {
          const output = graphUtil.getOutputRelativePath(graphNode, packageName);

          /** 遍历 module 的 assets */
          for (const assetName in clonedAssets) {
            /** 文件名可能被 loader 更改 */
            const filename = path.join(path.dirname(output), path.basename(assetName));
            const fileSource = $.cloneDeep(assets[assetName]);
            const fileInfo: CustomAssetInfo = assetsInfo.get(assetName) || {};
            const { placeholderMap } = fileInfo;

            /** 替换占位符 */
            if (placeholderMap?.size) {
              fileSource._value = this.replaceAssetModule(absolutePath, fileSource._value, placeholderMap, packageName);

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
        });

        module.buildInfo.assets = optimizedAssets;
      }
    });
  }

  /** 替换静态资源占位符 */
  replaceAssetModule(
    source: string,
    sourceCode: string | Buffer,
    placeholderMap: PlaceholderMap,
    packageName: string,
  ): string {
    const { graphUtil } = this.dependencyGraph;
    let code = sourceCode.toString();

    placeholderMap.forEach(({ reference, referenceDir, referenceType, shouldRemoveExt }, placeholder) => {
      const referenceRelativePath = graphUtil.getReferencePath(source, reference, packageName);
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
