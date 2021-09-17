import path from 'path';
import { Chunk, Compilation, Compiler, Module, NormalModule } from 'webpack';
import { removeExt, Resolver } from '@weapp-toolkit/core';
import { INDEPENDENT_PKG_OUTSIDE_DEP_DIR } from 'src/utils/constant';
import { shouldIgnore } from 'src/utils/ignore';
import { DependencyTree } from '../modules/dependencyTree';
// import { SplitChunksPlugin } from 'webpack';

/**
 * DependencyPlugin 初始化选项
 */
export interface IOptimizeChunkPluginOptions {
  context: string /** app 目录 */;
  output?: string /** 拷贝代码的输出目录 */;
  ignore?: Array<RegExp> /** 忽略的文件（夹） */;
  dependencyTree: DependencyTree /** 依赖树实例 */;
}

interface ModuleRelationship {
  parents?: Set<string>;
  chunkNames: Set<string>;
  module: NormalModule;
  chunkNameAssetPathMap?: Map<string, string>;
}

/**
 * 处理小程序依赖以及依赖分析
 */
export class OptimizeChunkPlugin {
  static PLUGIN_NAME = 'OptimizeChunkPlugin';

  /** 小程序项目根文件夹，app.json 所在目录 */
  context!: string;

  /** 模块路径解析器 */
  resolver!: Resolver;

  /** 独立分包外部依赖拷贝目录 */
  output: string;

  /** 忽略的文件 */
  ignore: Required<IOptimizeChunkPluginOptions>['ignore'];

  /** 静态资源模块依赖表 */
  assetsModuleMap = new Map<string, ModuleRelationship>();

  /** 依赖树 */
  dependencyTree!: DependencyTree;

  constructor(options: IOptimizeChunkPluginOptions) {
    this.context = options.context;
    this.dependencyTree = options.dependencyTree;
    this.output = options.output || INDEPENDENT_PKG_OUTSIDE_DEP_DIR;
    this.ignore = [/.(js|ts)x?$/].concat(options.ignore || []);
  }

  apply(compiler: Compiler): void {
    // compiler.hooks.thisCompilation.tap(OptimizeChunkPlugin.PLUGIN_NAME, (compilation) => {
    //   compilation.hooks.buildModule.tap(OptimizeChunkPlugin.PLUGIN_NAME, (module) => {
    //     if (module instanceof NormalModule) {
    //       console.info('skr: module', module);
    //     }
    //   });
    // });

    compiler.hooks.finishMake.tap(OptimizeChunkPlugin.PLUGIN_NAME, (compilation) => {
      const cloneChunkCache = new Map();

      compilation.hooks.optimizeModules.tap(OptimizeChunkPlugin.PLUGIN_NAME, (modules) => {
        Array.from(modules).forEach((module) => {
          if (module instanceof NormalModule && module.resource.includes('png')) {
            console.info('skr: compilation modules', { module, chunk: compilation.chunkGraph.getModuleChunks(module) });
          }
        });
      });

      compilation.hooks.afterOptimizeChunks.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        const { dependencyTree } = this;

        compilation.entrypoints.forEach((entryPoint) => {
          const packageGroup = dependencyTree.modulesMap.get(entryPoint.name || '')?.packageGroup;
          if (packageGroup && packageGroup !== 'app') {
            // 如果是独立分包！
            const { chunkGraph } = compilation;
            entryPoint.chunks.forEach((c) => {
              // TODO: 更合理的方式判断splitChunk
              if (c.chunkReason && c.chunkReason.indexOf('split chunk') > -1) {
                const clonedChunkName = `${packageGroup}/${INDEPENDENT_PKG_OUTSIDE_DEP_DIR}/${c.name}`;
                let clonedChunk = cloneChunkCache.get(clonedChunkName);
                if (!clonedChunk) {
                  clonedChunk = new Chunk(clonedChunkName);
                  chunkGraph.getChunkModules(c).forEach((m) => {
                    chunkGraph.connectChunkAndModule(clonedChunk, m);
                  });
                  clonedChunk.runtime = c.runtime;
                  clonedChunk.chunkReason = c.chunkReason;

                  cloneChunkCache.set(clonedChunkName, clonedChunk);
                  compilation.chunks.add(clonedChunk);
                }

                // Merge id name hints
                c.idNameHints.forEach((hint) => {
                  clonedChunk.idNameHints.add(hint);
                });

                for (const [module, chunkGroup] of Array.from(
                  chunkGraph.getChunkEntryModulesWithChunkGroupIterable(entryPoint.getEntrypointChunk()),
                )) {
                  if (chunkGroup === entryPoint) {
                    chunkGraph.disconnectChunkAndEntryModule(c, module);
                    chunkGraph.connectChunkAndEntryModule(clonedChunk, module, entryPoint);
                  }
                }

                entryPoint.replaceChunk(c, clonedChunk);
                clonedChunk.addGroup(entryPoint);
                c.removeGroup(entryPoint);
              }
            });
          }
        });
      });

      compilation.hooks.beforeModuleAssets.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        // this.replaceAssetsModule(compilation);
      });

      compilation.hooks.beforeChunkAssets.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        console.info('skr: beforeChunkAssets', Object.keys(compilation.assets));
      });
    });

    compiler.hooks.environment.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
      const splitChunksConfig = compiler.options.optimization.splitChunks;
      const processedConfig: typeof splitChunksConfig = {
        ...splitChunksConfig,
        minChunks: 1,
        minSize: 1,
        chunks: 'all',
        name: (module: Module, chunks: Chunk[], cacheGroupKey: string) => {
          // debugger;
          if (module instanceof NormalModule) {
            if (path.extname(module.resource) === '.js' && !module.isEntryModule()) {
              // debugger;
              return removeExt(path.relative(this.dependencyTree.appRoot, module.resource));
            }
          }
          // TODO: 普通分包的放普通分包里
          // const moduleFileName = module
          //   .identifier()
          //   .split('/')
          //   .reduceRight((item) => item);
          // const allChunksNames = chunks.map((item) => item.name).join('~');
          // return `${allChunksNames}-${moduleFileName}`;
        },
      };
      compiler.options.optimization.splitChunks = processedConfig;
    });
  }

  /** 替换静态资源占位符，并修改输出路径 */
  replaceAssetsModule(compilation: Compilation): void {
    compilation.modules.forEach((module) => {
      if (module instanceof NormalModule && !shouldIgnore(this.ignore, module.resource)) {
        const { resource } = module;
        const { assets, assetsInfo } = module.buildInfo;

        console.info('skr: chunkNames', { resource, assetsInfo });

        /** 遍历 module 的 assets */
        // for (const asset in assets) {
        //   const filename = path.basename(asset);
        //   const fileSource = $.cloneDeep(assets[asset]);
        //   const fileInfo = assetsInfo.get(asset);

        //   /** 根据 chunk 拷贝资源并修改路径 */
        //   for (const chunk of chunks) {
        //     const chunkName = chunk.name;
        //     const newFilename = path.join(path.dirname(chunkName), filename);

        //     assets[newFilename] = fileSource;
        //     assetsInfo.set(newFilename, fileInfo);
        //   }

        //   // const newFilename = path.join(path.relative(this.context, module.resource));

        //   // assets[newFilename] = fileSource;
        //   // assetsInfo.set(newFilename, fileInfo);

        //   /** 删除旧的资源 */
        //   delete assets[asset];
        //   assetsInfo.delete(asset);
        // }

        // console.info('skr: moduleAsset', {
        //   chunk: compilation.chunkGraph.getModuleChunks(module),
        //   // modules: compilation.moduleGraph.getIncomingConnections(module),
        //   assets: module.buildInfo.assets,
        //   assetsInfo: module.buildInfo.assetsInfo,
        // });
        // const moduleGraphConnection = Array.from(compilation.moduleGraph.getIncomingConnections(module))[0];
        // console.info('skr: incoming module', moduleGraphConnection.resolvedModule.dependencies);
        // // console.info('skr: issuer module', compilation.moduleGraph);
      }
    });
  }
}
