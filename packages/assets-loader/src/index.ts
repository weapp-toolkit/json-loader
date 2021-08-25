import path from 'path';
import { loader } from 'webpack';
import { getOptions } from 'loader-utils';
import { getAssets } from './core';


/**
 * 微信小程序 js 解析器
 * 解析 js 内部引用的图片等资源
 *
 * @param source
 * @returns
 */
function loader(this: loader.LoaderContext, source: string | Buffer): void {
  const options = getOptions(this);
  const callback = this.async();

  // validate(schema, options);

  /** 将 source 转为 string 类型 */
  const sourceString = typeof source === 'string' ? source : source.toString();

  getAssets(this.context, sourceString);

  /** 返回转为字符串后的 JSON */
  return callback?.(null, sourceString);
}

export default loader;
