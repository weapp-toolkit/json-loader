import $ from 'lodash';
import { LoaderContext } from 'webpack';
import { AsyncSeriesBailHook } from 'tapable';
import { Resolver } from '@weapp-toolkit/core';
import { IPlaceholderMapValue, PlaceholderMap } from '@weapp-toolkit/weapp-types';
import { handleSourceCode, replacePlaceholder } from './core';
import { AssetImportType, Assets } from './types';

export interface HandlerRunnerClassOptions<T> {
  loaderContext: LoaderContext<T>;
  loaderOptions: T;
  appRoot: string;
  source: string;
  resolver: Resolver;
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
  before: AsyncSeriesBailHook<string, string>;
  httpAsset: AsyncSeriesBailHook<HooksParameter, string>;
  unknownAsset: AsyncSeriesBailHook<HooksParameter, string>;
  moduleAsset: AsyncSeriesBailHook<HooksParameter, string>;
  normalAsset: AsyncSeriesBailHook<HooksParameter, string>;
  globAssets: AsyncSeriesBailHook<HooksParameter, string>;
  after: AsyncSeriesBailHook<string, string>;
}

export class HandlerRunner<T> {
  public hooks: HooksTypes;

  public loaderContext: LoaderContext<T>;

  public loaderOptions: T;

  public appRoot: string;

  public source: string;

  public resolver: Resolver;

  public placeholderMap: PlaceholderMap = new Map<string, IPlaceholderMapValue>();

  constructor(options: HandlerRunnerClassOptions<T>) {
    this.loaderContext = options.loaderContext;
    this.loaderOptions = options.loaderOptions;
    this.appRoot = options.appRoot;
    this.source = options.source;
    this.resolver = options.resolver;

    this.hooks = {
      before: new AsyncSeriesBailHook<string, string>(['code']),
      httpAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      unknownAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      moduleAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      normalAsset: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      globAssets: new AsyncSeriesBailHook<HooksParameter, string>(['context']),
      after: new AsyncSeriesBailHook<string, string>(['code']),
    };
  }

  async run(): Promise<string> {
    const handleResult = handleSourceCode(this.source);
    const { assets, code } = handleResult;
    return this.handle(assets, code);
  }

  private async handle(assets: Assets[], code: string): Promise<string> {
    const { hooks } = this;

    code = await hooks.before.promise(code);

    /** 处理所有识别的资源 */
    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      const end = replacePlaceholder.bind(null, index, code);
      const context = { code, asset, end };

      switch (asset.type) {
        case AssetImportType.Http:
          code = await hooks.httpAsset.promise(context);
          break;
        case AssetImportType.Unknown:
          code = await hooks.unknownAsset.promise(context);
          break;
        case AssetImportType.Module: {
          code = await hooks.moduleAsset.promise(context);
          break;
        }
        case AssetImportType.Normal: {
          code = await hooks.normalAsset.promise(context);
          break;
        }
        case AssetImportType.Glob: {
          code = await hooks.globAssets.promise(context);
          break;
        }
        default:
          break;
      }
    }

    return hooks.after.promise(code);
  }
}

export const handlerRunner = <T>(options: HandlerRunnerOptions<T>) => {
  const { handlers, loaderContext } = options;
  const runner = new HandlerRunner($.omit(options, 'handlers'));

  handlers.forEach(({ test, handler }) => {
    if (test.test(loaderContext.resourcePath)) {
      handler.apply(runner);
    }
  });

  return runner;
};
