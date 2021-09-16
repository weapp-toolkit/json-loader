import { Chunk, Compiler, Module, NormalModule, optimize } from 'webpack';
import { removeExt, Resolver } from '@weapp-toolkit/core';
import path from 'path';
import { DependencyTree } from '../modules/dependencyTree';
import webpack from 'webpack';
// import { SplitChunksPlugin } from 'webpack';

/**
 * DependencyPlugin 初始化选项
 */
export interface IOptimizeChunkPluginOptions {
  ignore?: Array<string | RegExp> /** 忽略的文件（夹） */;
  dependencyTree: DependencyTree /** 依赖树实例 */;
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

  /** 依赖树 */
  dependencyTree!: DependencyTree;

  splitChunksPlugin!: optimize.SplitChunksPlugin;

  constructor(options: IOptimizeChunkPluginOptions) {
    this.dependencyTree = options.dependencyTree;
  }

  apply(compiler: Compiler): void {
    compiler.hooks.finishMake.tap(OptimizeChunkPlugin.PLUGIN_NAME, (compilation) => {
      const cloneChunkCache = new Map();

      compilation.hooks.optimizeModules.tap(OptimizeChunkPlugin.PLUGIN_NAME, (modules) => {
        // console.info('skr: compilation modules', compilation.chunkGraph.getModuleChunks(Array.from(modules)[1]));
      });

      compilation.hooks.afterOptimizeChunks.tap(OptimizeChunkPlugin.PLUGIN_NAME, () => {
        const dependencyTree = this.dependencyTree;

        compilation.entrypoints.forEach((entryPoint) => {
          // debug console zhuojun
          console.log('>>>>>>>>>>>> debug console zhuojun', compilation);
          const packageGroup = dependencyTree.modulesMap.get(entryPoint.name || '')?.packageGroup;
          if (packageGroup && packageGroup !== 'app') {
            // 独立分包！
            debugger;
            const chunkGraph = compilation.chunkGraph;
            entryPoint.chunks.forEach((c) => {
              if (c.chunkReason && c.chunkReason.indexOf('split chunk') > -1) {
                const clonedChunkName = `${packageGroup}/_move/${c.name}`;
                let clonedChunk = cloneChunkCache.get(clonedChunkName);
                if (!clonedChunk) {
                  clonedChunk = new Chunk(clonedChunkName);
                  chunkGraph.getChunkModules(c).forEach((m) => {
                    chunkGraph.connectChunkAndModule(clonedChunk, m);
                  });
                  clonedChunk.runtime = (entryPoint.options as any).runtime;

                  cloneChunkCache.set(clonedChunkName, clonedChunk);
                }

                // Merge id name hints
                for (const hint of c.idNameHints) {
                  clonedChunk.idNameHints.add(hint);
                }
                for (const [module, chunkGroup] of Array.from(
                  chunkGraph.getChunkEntryModulesWithChunkGroupIterable(entryPoint.getEntrypointChunk()),
                )) {
                  debugger;
                  if (chunkGroup === entryPoint) {
                    chunkGraph.disconnectChunkAndEntryModule(c, module);
                    chunkGraph.connectChunkAndEntryModule(clonedChunk, module, entryPoint);
                  }
                }

                // debug console zhuojun
                console.log('>>>>>>>>>>>> debug console zhuojun', clonedChunk);
                entryPoint.replaceChunk(c, clonedChunk);
                clonedChunk.addGroup(entryPoint);
                c.removeGroup(entryPoint);
              }
            });
          }
        });

        // console.info('skr: chunkAsset', filename, chunk);
      });

      // compilation.hooks.optimizeModules.tap(OptimizeChunkPlugin.PLUGIN_NAME, (modules) => {
      //   console.info('skr: compilation modules', Array.from(modules)[0]);
      // });
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
}
