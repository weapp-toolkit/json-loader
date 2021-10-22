import { LoaderContext, AssetInfo } from 'webpack';
import { interpolateName, parseQuery } from 'loader-utils';
import { JSONSchema7 } from 'json-schema';
import path from 'path';

import { normalizePath } from './util';
import schema from './options';

export interface JsonLoaderOptions {
  /** cdn 路径 */
  cdn?: string;
  /** 是否为 esModule */
  esModule?: boolean;
  /** 文件名称 */
  name?: string;
  /** 忽略处理此文件 */
  ignore?: boolean;
}

/**
 * @description
 * 处理资源文件路径，转为cdn路径
 *
 * @param this
 * @param source
 * @returns
 */
function loader(this: LoaderContext<JsonLoaderOptions>, source: Buffer): Buffer | string {
  const options = Object.assign(
    {},
    this.getOptions(schema as JSONSchema7),
    parseQuery(this.resourceQuery || '?'),
  ) as JsonLoaderOptions;

  const { cdn, name = '[name].[contenthash:8].[ext]', ignore = false, esModule } = options;
  const { rootContext } = this;

  // console.info('skr: cdn-loader', this.resourcePath, options);
  /**
   * @description
   * 文件输出路径，实际的文件系统写入路径
   * loader-utils 的类型文件没有更新导致冲突
   */
  const fileOutputPath = interpolateName(this as any, name, {
    content: source,
  });

  const assetInfo: AssetInfo = {
    immutable: true,
    sourceFilename: normalizePath(path.relative(rootContext, this.resourcePath)),
  };

  /** 忽略此文件时输出到本地目录 */
  if (ignore) {
    this.emitFile(name, source, undefined, assetInfo);
    return '';
  }

  /** cdn 不存在则不处理 */
  if (!cdn) {
    this.emitFile(path.basename(this.resourcePath), source, undefined, assetInfo);
    /** 导出该文件路径 */
    return esModule ? `export default '${this.resourcePath}'` : `module.exports = '${this.resourcePath}'`;
  }

  /**
   * @description
   * 文件的cdn访问路径拼接
   */
  const fileCdnUrl = cdn.endsWith('/') ? `${cdn}${fileOutputPath}` : `${cdn}/${fileOutputPath}`;

  this.emitFile(
    fileOutputPath,
    source,
    undefined,
    Object.assign(assetInfo, {
      keepName: true /** 保持文件名，不允许修改 */,
    }),
  );

  /** 导出该文件路径 */
  const result = esModule ? `export default '${fileCdnUrl}'` : `module.exports = '${fileCdnUrl}'`;

  return result;
}

export default loader;

export const raw = true;
