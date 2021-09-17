import path from 'path';
import { Compiler, LoaderContext } from 'webpack';
import { validate } from 'schema-utils';
import { JSONSchema7 } from 'json-schema';
import { createResolver, resolveAppEntryPath } from '@weapp-toolkit/core';
import { getOptions } from 'loader-utils';
import { handlerRunner } from './handler-runner';
import { DefaultHandler } from './handler/default';
import { JavascriptHandler } from './handler/javascript';
import { WxmlHandler } from './handler/wxml';
import { WxsHandler } from './handler/wxs';
import { JsonHandler } from './handler/json';
import { CssHandler } from './handler/css';

export interface AssetsLoaderOptions {
  esModule?: boolean;
}

const schema: JSONSchema7 = {
  type: 'object',
  properties: {
    esModule: {
      type: 'boolean',
      default: true,
    },
  },
};

/**
 * 微信小程序 js 解析器
 * 解析 js 内部引用的图片等资源
 *
 * @param source
 * @returns
 */
async function assetsLoader(this: LoaderContext<AssetsLoaderOptions>, source: string | Buffer): Promise<void> {
  const options = getOptions(this) as AssetsLoaderOptions;
  const callback = this.async();

  validate(schema, options);

  // const { esModule } = options;

  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();
  /** loader 调用时 compiler 一定存在 */
  const compiler = this._compiler as Compiler;
  const app = resolveAppEntryPath(compiler);
  const appRoot = path.dirname(app);
  const resolve = createResolver(compiler, appRoot);

  // console.info('skr: sourceString', sourceString);

  /**
   * handler runner 主要为了解决不同类型文件对资源的处理不同的问题
   * 如果扁平化处理，会出现很多 if else
   */
  const runner = handlerRunner({
    loaderContext: this,
    loaderOptions: options,
    source: sourceString,
    appRoot,
    resolve,
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
        test: /\.(css|wxss|less|sass|scss|styl|stylus)$/,
        handler: new CssHandler(),
      },
      {
        test: /.*$/,
        handler: new DefaultHandler(),
      },
    ],
  });
  const code = await runner.run();

  /** 返回处理后的字符串 */
  return callback?.(null, code);
}

export default assetsLoader;
