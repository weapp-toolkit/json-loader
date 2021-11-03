import path from 'path';
import $ from 'lodash';
import { Compiler, LoaderContext } from 'webpack';
import { JSONSchema7 } from 'json-schema';
import {
  FileResolver,
  resolveAppEntryPath,
  AUDIO_EXT_REG,
  IMAGE_EXT_REG,
  VIDEO_EXT_REG,
  CSS_EXT_REG,
  XCX_RESOURCE_EXT_REG,
} from '@weapp-toolkit/tools';
import { DependencyGraph } from '@weapp-toolkit/core';
import { handlerRunner } from './handler-runner';
import { DefaultHandler } from './handler/default';
import { JavascriptHandler } from './handler/javascript';
import { WxmlHandler } from './handler/wxml';
import { WxsHandler } from './handler/wxs';
import { JsonHandler } from './handler/json';
import { CssHandler } from './handler/css';

export interface AssetsLoaderOptions {
  esModule?: boolean;
  includes?: RegExp[];
  excludes?: RegExp[];
}

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    esModule: {
      type: 'boolean',
      default: true,
    },
    includes: {
      type: 'array',
    },
    excludes: {
      type: 'array',
    },
  },
};

const DEFAULT_INCLUDES = [XCX_RESOURCE_EXT_REG, IMAGE_EXT_REG, AUDIO_EXT_REG, VIDEO_EXT_REG];

/**
 * 微信小程序 js 解析器
 * 解析 js 内部引用的图片等资源
 *
 * @param source
 * @returns
 */
async function assetsLoader(this: LoaderContext<AssetsLoaderOptions>, source: string | Buffer): Promise<void> {
  const options = $.updateWith(this.getOptions(schema), 'includes', (old) => {
    return old ? old.concat(DEFAULT_INCLUDES) : DEFAULT_INCLUDES;
  });
  const callback = this.async();

  // const { esModule } = options;

  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();
  /** loader 调用时 compiler 一定存在 */
  const compiler = this._compiler as Compiler;
  const app = resolveAppEntryPath(compiler);
  const appRoot = path.dirname(app);
  const resolver = new FileResolver(compiler.options.resolve, appRoot);

  // console.info('skr: sourceString', sourceString);

  /**
   * handler runner 主要为了解决不同类型文件对资源的处理不同的问题
   * 如果扁平化处理，会出现很多 if else
   */
  const runner = handlerRunner<AssetsLoaderOptions>({
    loaderContext: this,
    loaderOptions: options,
    source: sourceString,
    appRoot,
    resolver,
    dependencyGraph: DependencyGraph.getInstance(),
    handlers: [
      {
        test: /\.(js|ts)$/,
        handler: new JavascriptHandler(),
      },
      {
        test: /\.(wxml)$/,
        handler: new WxmlHandler(),
      },
      {
        test: /\.(wxs)$/,
        handler: new WxsHandler(),
      },
      {
        test: /\.(json)$/,
        handler: new JsonHandler(),
      },
      {
        test: CSS_EXT_REG,
        handler: new CssHandler(),
      },
      {
        test: /.*$/,
        handler: new DefaultHandler(),
      },
    ],
  });
  const code = await runner.run().catch(this.emitError.bind(this));

  /** 返回处理后的字符串 */
  return callback?.(null, code!);
}

export default assetsLoader;
