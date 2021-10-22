import $ from 'lodash';
import { LoaderContext } from 'webpack';
import { AsyncSeriesBailHook } from 'tapable';
import { FileResolver } from '@weapp-toolkit/tools';
import { IPlaceholderMapValue, PlaceholderMap } from '@weapp-toolkit/weapp-types';
import { DependencyGraph } from '@weapp-toolkit/core';
import { replacePlaceholder } from './core';
import { Assets, AssetImportType } from './modules/asset/type';
import { IHandleSourceCodeResult } from './types';

export interface HandlerRunnerClassOptions<T> {
  loaderContext: LoaderContext<T>;
  loaderOptions: T;
  appRoot: string;
  source: string;
  resolver: FileResolver;
  dependencyGraph: DependencyGraph;
}

export interface Handler<T> {
  apply(runner: HandlerRunner<T>): void;
}

export interface HandlerRunnerOptions<T> extends HandlerRunnerClassOptions<T> {
  handlers: {
    test: RegExp;
    handler: Handler<T>;
  }[];
}

export interface HooksParameter {
  code: string;
  asset: Assets;
  end: (replaceString: string) => string;
}

interface HooksTypes {
  analysisCode: AsyncSeriesBailHook<string, IHandleSourceCodeResult>;
  beforeHandleAssets: AsyncSeriesBailHook<string, string>;
  handleHttpAsset: AsyncSeriesBailHook<HooksParameter, string>;
  handleUnknownAsset: AsyncSeriesBailHook<HooksParameter, string>;
  handleModuleAsset: AsyncSeriesBailHook<HooksParameter, string>;
  handleNormalAsset: AsyncSeriesBailHook<HooksParameter, string>;
  handleGlobAssets: AsyncSeriesBailHook<HooksParameter, string>;
  afterHandleAssets: AsyncSeriesBailHook<string, string>;
}

export class HandlerRunner<T> {
  public hooks: HooksTypes;

  public loaderContext: LoaderContext<T>;

  public loaderOptions: T;

  public appRoot: string;

  public source: string;

  public resolver: FileResolver;

  public dependencyGraph: DependencyGraph;

  public placeholderMap: PlaceholderMap = new Map<string, IPlaceholderMapValue>();

  constructor(options: HandlerRunnerClassOptions<T>) {
    this.loaderContext = options.loaderContext;
    this.loaderOptions = options.loaderOptions;
    this.appRoot = options.appRoot;
    this.source = options.source;
    this.resolver = options.resolver;
    this.dependencyGraph = options.dependencyGraph;

    this.hooks = {
      analysisCode: new AsyncSeriesBailHook<string, IHandleSourceCodeResult>(['code']),
      beforeHandleAssets: new AsyncSeriesBailHook<string, string>(['code']),
      handleHttpAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      handleUnknownAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      handleModuleAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      handleNormalAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      handleGlobAssets: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      afterHandleAssets: new AsyncSeriesBailHook<string, string>(['code']),
    };
  }

  async run(): Promise<string> {
    const { assets, code } = await this.hooks.analysisCode.promise(this.source);
    return this.handle(assets, code);
  }

  private async handle(assets: Assets[], code: string): Promise<string> {
    const { hooks } = this;

    code = await hooks.beforeHandleAssets.promise(code);

    /** 处理所有识别的资源 */
    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      const end = replacePlaceholder.bind(null, index, code);
      const context = { code, asset, end };

      switch (asset.type) {
        case AssetImportType.Http:
          code = await hooks.handleHttpAsset.promise(context);
          break;
        case AssetImportType.Unknown:
          code = await hooks.handleUnknownAsset.promise(context);
          break;
        case AssetImportType.Module: {
          code = await hooks.handleModuleAsset.promise(context);
          break;
        }
        case AssetImportType.Normal: {
          code = await hooks.handleNormalAsset.promise(context);
          break;
        }
        case AssetImportType.Glob: {
          code = await hooks.handleGlobAssets.promise(context);
          break;
        }
        default:
          break;
      }
    }

    return hooks.afterHandleAssets.promise(code);
  }
}

export const handlerRunner = <T>(options: HandlerRunnerOptions<T>) => {
  const { handlers, loaderContext } = options;
  const runner = new HandlerRunner<T>($.omit(options, 'handlers'));

  handlers.forEach(({ test, handler }) => {
    if (test.test(loaderContext.resourcePath)) {
      handler.apply(runner);
    }
  });

  return runner;
};
